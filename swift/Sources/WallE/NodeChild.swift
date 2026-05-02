import Foundation

final class NodeChild {
    var onReaction: ((String) -> Void)?
    var onLog: ((String) -> Void)?

    private var process: Process?
    private var stdoutPipe: Pipe?
    private var stderrPipe: Pipe?
    private var stopping = false

    func start() {
        spawn()
    }

    func stop() {
        stopping = true
        process?.terminationHandler = nil
        process?.terminate()
        process = nil
    }

    private func bundledNode() -> URL? {
        let bundleURL = Bundle.main.bundleURL
        let resources = bundleURL.appendingPathComponent("Contents/Resources", isDirectory: true)
        let candidate = resources.appendingPathComponent("node")
        if FileManager.default.isExecutableFile(atPath: candidate.path) { return candidate }
        return nil
    }

    private func bundledDaemon() -> URL? {
        let bundleURL = Bundle.main.bundleURL
        let resources = bundleURL.appendingPathComponent("Contents/Resources", isDirectory: true)
        let candidate = resources.appendingPathComponent("daemon/index.js")
        if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        return nil
    }

    private func devFallback() -> (node: URL, daemon: URL)? {
        // When running from `swift run`, fall back to system Node + repo daemon.
        // The repo root is the parent of the swift/ directory.
        let env = ProcessInfo.processInfo.environment
        if let nodePath = env["WALLE_NODE_PATH"], let daemonPath = env["WALLE_DAEMON_PATH"] {
            return (URL(fileURLWithPath: nodePath), URL(fileURLWithPath: daemonPath))
        }

        // Last-ditch: search common Node install locations.
        let candidates = ["/usr/local/bin/node", "/opt/homebrew/bin/node", "/usr/bin/node"]
        guard let node = candidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            return nil
        }
        // Repo daemon lives at ../index.js relative to the swift package.
        let cwd = FileManager.default.currentDirectoryPath
        let daemon = URL(fileURLWithPath: cwd).appendingPathComponent("../index.js").standardizedFileURL
        guard FileManager.default.fileExists(atPath: daemon.path) else { return nil }
        return (URL(fileURLWithPath: node), daemon)
    }

    private func spawn() {
        let nodeURL: URL
        let daemonURL: URL
        if let bundled = bundledNode(), let daemon = bundledDaemon() {
            nodeURL = bundled
            daemonURL = daemon
        } else if let dev = devFallback() {
            nodeURL = dev.node
            daemonURL = dev.daemon
        } else {
            FileHandle.standardError.write(Data("[WallE] no bundled or system Node found\n".utf8))
            return
        }

        let proc = Process()
        proc.executableURL = nodeURL
        proc.arguments = [daemonURL.path]

        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        proc.standardOutput = stdoutPipe
        proc.standardError = stderrPipe

        let stdoutHandler = LineBuffer { [weak self] line in
            self?.handleLine(line)
        }
        stdoutPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if data.isEmpty { return }
            stdoutHandler.feed(data)
        }
        stderrPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if data.isEmpty { return }
            if let s = String(data: data, encoding: .utf8) {
                self?.onLog?(s)
            }
        }

        proc.terminationHandler = { [weak self] _ in
            guard let self, !self.stopping else { return }
            // Restart after a short delay to avoid tight crash loops.
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                self.spawn()
            }
        }

        do {
            try proc.run()
            self.process = proc
            self.stdoutPipe = stdoutPipe
            self.stderrPipe = stderrPipe
        } catch {
            FileHandle.standardError.write(Data("[WallE] failed to spawn node: \(error)\n".utf8))
        }
    }

    private func handleLine(_ line: String) {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("EVENT reaction ") {
            let key = String(trimmed.dropFirst("EVENT reaction ".count))
            onReaction?(key)
        } else if !trimmed.isEmpty {
            onLog?(trimmed)
        }
    }
}

/// Splits a stream of bytes into newline-terminated lines.
final class LineBuffer {
    private var buffer = Data()
    private let onLine: (String) -> Void

    init(onLine: @escaping (String) -> Void) {
        self.onLine = onLine
    }

    func feed(_ data: Data) {
        buffer.append(data)
        while let nl = buffer.firstIndex(of: 0x0a) {
            let lineData = buffer.subdata(in: 0..<nl)
            buffer.removeSubrange(0...nl)
            if let line = String(data: lineData, encoding: .utf8) {
                onLine(line)
            }
        }
    }
}
