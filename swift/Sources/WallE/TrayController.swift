import AppKit

final class TrayController: NSObject, NSMenuDelegate {
    private let statusItem: NSStatusItem
    private let face: FaceIcon
    private let config: ConfigStore

    init(face: FaceIcon, config: ConfigStore) {
        self.face = face
        self.config = config
        self.statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        super.init()

        face.imageDidChange = { [weak self] image in
            self?.statusItem.button?.image = image
        }
        // Trigger initial render
        face.setEnabled(config.snapshot.enabled)

        configureButton()
        configureMenu()
    }

    private func configureButton() {
        guard let button = statusItem.button else { return }
        button.target = self
        button.action = #selector(handleClick(_:))
        button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        button.toolTip = "WALL-E"
    }

    private func configureMenu() {
        // Built lazily in handleClick on right-click; left-click toggles enabled.
    }

    @objc private func handleClick(_ sender: NSStatusBarButton) {
        let event = NSApp.currentEvent
        if event?.type == .rightMouseUp || (event?.modifierFlags.contains(.control) ?? false) {
            showMenu()
        } else {
            toggleEnabled()
        }
    }

    private func toggleEnabled() {
        let next = config.toggleEnabled()
        face.setEnabled(next)
    }

    private func showMenu() {
        let menu = NSMenu()
        menu.delegate = self

        let toggleTitle = config.snapshot.enabled ? "Disable reactions" : "Enable reactions"
        menu.addItem(withTitle: toggleTitle, action: #selector(menuToggle), keyEquivalent: "")
            .target = self

        menu.addItem(.separator())

        let openConfigItem = menu.addItem(withTitle: "Open config…", action: #selector(menuOpenConfig), keyEquivalent: ",")
        openConfigItem.target = self

        let loginItem = menu.addItem(
            withTitle: LoginItem.isRegistered() ? "✓ Launch at login" : "Launch at login",
            action: #selector(menuToggleLoginItem),
            keyEquivalent: ""
        )
        loginItem.target = self

        menu.addItem(.separator())
        let quitItem = menu.addItem(withTitle: "Quit WALL-E", action: #selector(menuQuit), keyEquivalent: "q")
        quitItem.target = self

        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        // Detach menu so the next left-click toggles instead of opening menu.
        DispatchQueue.main.async { [weak self] in
            self?.statusItem.menu = nil
        }
    }

    @objc private func menuToggle() { toggleEnabled() }

    @objc private func menuOpenConfig() {
        NSWorkspace.shared.open(config.path)
    }

    @objc private func menuToggleLoginItem() {
        if LoginItem.isRegistered() { LoginItem.unregister() }
        else { LoginItem.register() }
    }

    @objc private func menuQuit() {
        NSApp.terminate(nil)
    }

    func applyConfigChange() {
        config.reload()
        face.setEnabled(config.snapshot.enabled)
    }
}
