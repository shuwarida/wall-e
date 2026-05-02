import AppKit

enum FaceState {
    case idleEnabled
    case disabled
    case reacting
}

/// Owns the menu-bar icon. Renders a 22pt round face with two eyes that:
///  - blink at human cadence when enabled
///  - shows `-_-` (sleeping) when disabled
///  - shows wide eyes for ~1.5s after a reaction event
final class FaceIcon {
    private(set) var state: FaceState = .idleEnabled
    private var eyesOpen = true

    private var blinkTimer: Timer?
    private var blinkRestoreTimer: Timer?
    private var reactionTimer: Timer?

    var imageDidChange: ((NSImage) -> Void)?

    init() {
        rerender()
        scheduleNextBlink()
    }

    func setEnabled(_ enabled: Bool) {
        state = enabled ? .idleEnabled : .disabled
        eyesOpen = true
        cancelReaction()
        if enabled {
            scheduleNextBlink()
        } else {
            blinkTimer?.invalidate()
            blinkTimer = nil
            blinkRestoreTimer?.invalidate()
            blinkRestoreTimer = nil
        }
        rerender()
    }

    func triggerReaction() {
        guard state != .disabled else { return }
        state = .reacting
        rerender()
        reactionTimer?.invalidate()
        reactionTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: false) { [weak self] _ in
            guard let self else { return }
            self.state = .idleEnabled
            self.rerender()
        }
    }

    private func cancelReaction() {
        reactionTimer?.invalidate()
        reactionTimer = nil
    }

    private func scheduleNextBlink() {
        blinkTimer?.invalidate()
        let delay = Double.random(in: 4.0...6.0)
        blinkTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            self?.blink()
        }
    }

    private func blink() {
        guard state == .idleEnabled else {
            scheduleNextBlink()
            return
        }
        eyesOpen = false
        rerender()
        blinkRestoreTimer = Timer.scheduledTimer(withTimeInterval: 0.15, repeats: false) { [weak self] _ in
            guard let self else { return }
            self.eyesOpen = true
            self.rerender()
            self.scheduleNextBlink()
        }
    }

    private func rerender() {
        let image = renderImage(size: 18)
        image.isTemplate = true
        imageDidChange?(image)
    }

    private func renderImage(size: CGFloat) -> NSImage {
        let capturedState = state
        let capturedEyesOpen = eyesOpen
        let img = NSImage(size: NSSize(width: size, height: size), flipped: false) { _ in
            NSColor.black.setStroke()
            NSColor.black.setFill()

            let inset: CGFloat = 1.0
            let circle = NSBezierPath(ovalIn: NSRect(x: inset, y: inset,
                                                      width: size - 2 * inset, height: size - 2 * inset))
            circle.lineWidth = 1.2
            circle.stroke()

            let cx = size / 2
            let cy = size / 2
            let ex: CGFloat = 3.5
            let ey = cy + 1

            switch capturedState {
            case .disabled:
                Self.dash(cx: cx - ex, cy: ey,       len: 3.0)
                Self.dash(cx: cx + ex, cy: ey - 1.5, len: 3.0)
            case .idleEnabled:
                if capturedEyesOpen {
                    NSBezierPath(ovalIn: Self.er(cx: cx - ex, cy: ey, r: 1.4)).fill()
                    NSBezierPath(ovalIn: Self.er(cx: cx + ex, cy: ey, r: 1.4)).fill()
                } else {
                    Self.dash(cx: cx - ex, cy: ey, len: 2.8)
                    Self.dash(cx: cx + ex, cy: ey, len: 2.8)
                }
            case .reacting:
                NSBezierPath(ovalIn: Self.er(cx: cx - ex, cy: ey, r: 2.2)).fill()
                NSBezierPath(ovalIn: Self.er(cx: cx + ex, cy: ey, r: 2.2)).fill()
            }
            return true
        }
        return img
    }

    private static func er(cx: CGFloat, cy: CGFloat, r: CGFloat) -> NSRect {
        NSRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)
    }

    private static func dash(cx: CGFloat, cy: CGFloat, len: CGFloat) {
        let p = NSBezierPath()
        p.lineWidth = 1.3
        p.lineCapStyle = .round
        p.move(to: NSPoint(x: cx - len / 2, y: cy))
        p.line(to: NSPoint(x: cx + len / 2, y: cy))
        p.stroke()
    }
}
