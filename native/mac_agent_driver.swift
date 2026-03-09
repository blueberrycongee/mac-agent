import ApplicationServices
import Foundation

func fail(_ message: String) -> Never {
    fputs("mac-agent-driver: \(message)\n", stderr)
    exit(1)
}

func argumentValue(_ name: String, in arguments: [String]) -> String {
    guard let index = arguments.firstIndex(of: name), index + 1 < arguments.count else {
        fail("Missing required argument: \(name)")
    }

    return arguments[index + 1]
}

func doubleValue(_ name: String, in arguments: [String]) -> Double {
    let rawValue = argumentValue(name, in: arguments)

    guard let value = Double(rawValue) else {
        fail("Invalid numeric value for \(name): \(rawValue)")
    }

    return value
}

func int32Value(_ name: String, in arguments: [String]) -> Int32 {
    let rawValue = argumentValue(name, in: arguments)

    guard let value = Int32(rawValue) else {
        fail("Invalid integer value for \(name): \(rawValue)")
    }

    return value
}

func mouseButtonType(_ rawValue: String) -> CGMouseButton {
    switch rawValue {
    case "left":
        return .left
    case "right":
        return .right
    case "center":
        return .center
    default:
        fail("Unsupported mouse button: \(rawValue)")
    }
}

func mouseEventTypes(for button: CGMouseButton) -> (down: CGEventType, up: CGEventType) {
    switch button {
    case .left:
        return (.leftMouseDown, .leftMouseUp)
    case .right:
        return (.rightMouseDown, .rightMouseUp)
    case .center:
        return (.otherMouseDown, .otherMouseUp)
    @unknown default:
        return (.leftMouseDown, .leftMouseUp)
    }
}

func post(_ event: CGEvent?) {
    guard let event else {
        fail("Failed to create CGEvent")
    }

    event.post(tap: .cghidEventTap)
}

func moveMouse(to point: CGPoint) {
    let move = CGEvent(
        mouseEventSource: nil,
        mouseType: .mouseMoved,
        mouseCursorPosition: point,
        mouseButton: .left
    )
    post(move)
}

func clickMouse(at point: CGPoint, button: CGMouseButton) {
    moveMouse(to: point)

    let eventTypes = mouseEventTypes(for: button)
    let down = CGEvent(
        mouseEventSource: nil,
        mouseType: eventTypes.down,
        mouseCursorPosition: point,
        mouseButton: button
    )
    let up = CGEvent(
        mouseEventSource: nil,
        mouseType: eventTypes.up,
        mouseCursorPosition: point,
        mouseButton: button
    )

    post(down)
    post(up)
}

func doubleClickMouse(at point: CGPoint, button: CGMouseButton) {
    moveMouse(to: point)
    let eventTypes = mouseEventTypes(for: button)

    for clickState in [1, 2] {
        let down = CGEvent(
            mouseEventSource: nil,
            mouseType: eventTypes.down,
            mouseCursorPosition: point,
            mouseButton: button
        )
        down?.setIntegerValueField(.mouseEventClickState, value: Int64(clickState))

        let up = CGEvent(
            mouseEventSource: nil,
            mouseType: eventTypes.up,
            mouseCursorPosition: point,
            mouseButton: button
        )
        up?.setIntegerValueField(.mouseEventClickState, value: Int64(clickState))

        post(down)
        post(up)
    }
}

func dragMouse(to point: CGPoint) {
    let startPoint = CGEvent(source: nil)?.location ?? .zero
    let down = CGEvent(
        mouseEventSource: nil,
        mouseType: .leftMouseDown,
        mouseCursorPosition: startPoint,
        mouseButton: .left
    )
    let dragged = CGEvent(
        mouseEventSource: nil,
        mouseType: .leftMouseDragged,
        mouseCursorPosition: point,
        mouseButton: .left
    )
    let up = CGEvent(
        mouseEventSource: nil,
        mouseType: .leftMouseUp,
        mouseCursorPosition: point,
        mouseButton: .left
    )

    post(down)
    usleep(10_000)
    post(dragged)
    usleep(10_000)
    post(up)
}

func scroll(at point: CGPoint, deltaX: Int32, deltaY: Int32) {
    moveMouse(to: point)

    let event = CGEvent(
        scrollWheelEvent2Source: nil,
        units: .pixel,
        wheelCount: 2,
        wheel1: deltaY,
        wheel2: deltaX,
        wheel3: 0
    )

    post(event)
}

func printDisplayInfo() {
    let displayID = CGMainDisplayID()
    let displayBounds = CGDisplayBounds(displayID)

    let payload: [String: Int] = [
        "displayWidth": Int(displayBounds.width.rounded()),
        "displayHeight": Int(displayBounds.height.rounded())
    ]

    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]) else {
        fail("Unable to serialize display metadata")
    }

    FileHandle.standardOutput.write(data)
}

let arguments = Array(CommandLine.arguments.dropFirst())
guard let command = arguments.first else {
    fail("Missing command")
}

switch command {
case "display-info":
    printDisplayInfo()
case "click":
    let point = CGPoint(x: doubleValue("--x", in: arguments), y: doubleValue("--y", in: arguments))
    let button = mouseButtonType(argumentValue("--button", in: arguments))
    clickMouse(at: point, button: button)
case "double-click":
    let point = CGPoint(x: doubleValue("--x", in: arguments), y: doubleValue("--y", in: arguments))
    let button = mouseButtonType(argumentValue("--button", in: arguments))
    doubleClickMouse(at: point, button: button)
case "move":
    let point = CGPoint(x: doubleValue("--x", in: arguments), y: doubleValue("--y", in: arguments))
    moveMouse(to: point)
case "drag":
    let point = CGPoint(x: doubleValue("--x", in: arguments), y: doubleValue("--y", in: arguments))
    dragMouse(to: point)
case "scroll":
    let point = CGPoint(x: doubleValue("--x", in: arguments), y: doubleValue("--y", in: arguments))
    let deltaX = int32Value("--delta-x", in: arguments)
    let deltaY = int32Value("--delta-y", in: arguments)
    scroll(at: point, deltaX: deltaX, deltaY: deltaY)
default:
    fail("Unsupported command: \(command)")
}
