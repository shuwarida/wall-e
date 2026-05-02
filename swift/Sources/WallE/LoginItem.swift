import Foundation
import ServiceManagement
import AppKit

enum LoginItem {
    static func isRegistered() -> Bool {
        if #available(macOS 13.0, *) {
            return SMAppService.mainApp.status == .enabled
        }
        return false
    }

    @discardableResult
    static func register() -> Bool {
        if #available(macOS 13.0, *) {
            do {
                try SMAppService.mainApp.register()
                return true
            } catch {
                FileHandle.standardError.write(Data("[WallE] register login item failed: \(error)\n".utf8))
                return false
            }
        }
        return false
    }

    @discardableResult
    static func unregister() -> Bool {
        if #available(macOS 13.0, *) {
            do {
                try SMAppService.mainApp.unregister()
                return true
            } catch {
                FileHandle.standardError.write(Data("[WallE] unregister login item failed: \(error)\n".utf8))
                return false
            }
        }
        return false
    }

    /// Register on first run so the app stays out of the user's way after install.
    /// Subsequent launches are no-ops if already enabled.
    static func ensureRegistered() {
        if !isRegistered() { _ = register() }
    }
}

enum LegacyLaunchAgent {
    static let plistPath: URL = {
        let home = FileManager.default.homeDirectoryForCurrentUser
        return home.appendingPathComponent("Library/LaunchAgents/com.wall-e.app.plist")
    }()

    static func checkAndMigrate() {
        guard FileManager.default.fileExists(atPath: plistPath.path) else { return }

        let alert = NSAlert()
        alert.messageText = "Old WALL-E launch agent detected"
        alert.informativeText = "An older version of WALL-E is registered as a launchd agent. Remove it so the new app can manage itself?"
        alert.addButton(withTitle: "Remove")
        alert.addButton(withTitle: "Keep")
        alert.alertStyle = .warning

        if alert.runModal() == .alertFirstButtonReturn {
            let task = Process()
            task.launchPath = "/bin/launchctl"
            task.arguments = ["unload", plistPath.path]
            try? task.run()
            task.waitUntilExit()
            try? FileManager.default.removeItem(at: plistPath)
        }
    }
}
