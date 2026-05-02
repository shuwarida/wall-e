import Foundation

struct ConfigSnapshot {
    var enabled: Bool
    var volume: Double
    var notifications: Bool
}

final class ConfigStore {
    let path: URL

    private(set) var snapshot = ConfigSnapshot(enabled: true, volume: 1.0, notifications: false)

    init() {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = support.appendingPathComponent("wall-e", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        self.path = dir.appendingPathComponent("config.json")
    }

    func loadOrCreate() {
        if FileManager.default.fileExists(atPath: path.path) {
            reload()
        }
        // If file does not exist, the Node side will create it on first launch.
        // We start with default snapshot until then.
    }

    func reload() {
        guard let data = try? Data(contentsOf: path),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return }

        if let v = obj["enabled"] as? Bool { snapshot.enabled = v }
        if let v = obj["volume"] as? Double { snapshot.volume = v }
        if let v = obj["volume"] as? Int { snapshot.volume = Double(v) }
        if let v = obj["notifications"] as? Bool { snapshot.notifications = v }
    }

    /// Atomically toggle the master enabled flag. Reads the file first so we
    /// don't clobber other keys (events, monitors, volume) the Node side wrote.
    func toggleEnabled() -> Bool {
        var obj: [String: Any] = [:]
        if let data = try? Data(contentsOf: path),
           let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            obj = parsed
        }
        let next = !((obj["enabled"] as? Bool) ?? snapshot.enabled)
        obj["enabled"] = next

        if let out = try? JSONSerialization.data(withJSONObject: obj, options: [.prettyPrinted, .sortedKeys]) {
            let tmp = path.appendingPathExtension("tmp")
            try? out.write(to: tmp, options: .atomic)
            _ = try? FileManager.default.replaceItemAt(path, withItemAt: tmp)
        }
        snapshot.enabled = next
        return next
    }
}

final class ConfigWatcher {
    private let path: URL
    private var source: DispatchSourceFileSystemObject?
    private var fd: Int32 = -1
    private let onChange: () -> Void

    init(path: URL, onChange: @escaping () -> Void) {
        self.path = path
        self.onChange = onChange
    }

    func start() {
        // Re-arm on every change because rename-and-replace invalidates the fd.
        rearm()
    }

    private func rearm() {
        source?.cancel()
        if fd >= 0 { close(fd) }

        let fd = open(path.path, O_EVTONLY)
        guard fd >= 0 else {
            // File may not exist yet; retry shortly.
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in self?.rearm() }
            return
        }
        self.fd = fd

        let src = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .delete, .rename, .extend],
            queue: .main
        )
        src.setEventHandler { [weak self] in
            guard let self else { return }
            self.onChange()
            self.rearm()
        }
        src.setCancelHandler { [fd] in close(fd) }
        src.resume()
        self.source = src
    }
}
