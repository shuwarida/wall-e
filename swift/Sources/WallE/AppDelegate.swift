import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    var tray: TrayController?
    var nodeChild: NodeChild?
    var configWatcher: ConfigWatcher?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = ConfigStore()
        config.loadOrCreate()

        let face = FaceIcon()
        let tray = TrayController(face: face, config: config)
        self.tray = tray

        let watcher = ConfigWatcher(path: config.path) { [weak tray] in
            tray?.applyConfigChange()
        }
        watcher.start()
        self.configWatcher = watcher

        let node = NodeChild()
        node.onReaction = { [weak face] _ in
            DispatchQueue.main.async { face?.triggerReaction() }
        }
        node.start()
        self.nodeChild = node

        LegacyLaunchAgent.checkAndMigrate()
        LoginItem.ensureRegistered()

        face.setEnabled(config.snapshot.enabled)
    }

    func applicationWillTerminate(_ notification: Notification) {
        nodeChild?.stop()
    }
}
