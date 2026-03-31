import Capacitor
import ActivityKit

@objc(RestTimerPlugin)
public class RestTimerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RestTimerPlugin"
    public let jsName = "RestTimer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        print("🟡 RestTimerPlugin loaded!")
        // Clean up any stale Live Activities from previous app sessions
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<RestTimerAttributes>.activities {
                    if activity.content.state.endTime < Date() {
                        await activity.end(nil, dismissalPolicy: .immediate)
                    }
                }
            }
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        print("🟢 RestTimerPlugin.start() called")
        let seconds = call.getInt("seconds") ?? 90

        if #available(iOS 16.2, *) {
            let attributes = RestTimerAttributes(totalSeconds: seconds)
            let endTime = Date().addingTimeInterval(TimeInterval(seconds))
            let state = RestTimerAttributes.ContentState(endTime: endTime)

            // End any existing activities first
            for existing in Activity<RestTimerAttributes>.activities {
                Task { await existing.end(nil, dismissalPolicy: .immediate) }
            }

            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: endTime),
                    pushType: nil
                )
                // Auto-dismiss when timer reaches 0
                Task {
                    try? await Task.sleep(nanoseconds: UInt64(seconds) * 1_000_000_000)
                    await activity.end(nil, dismissalPolicy: .immediate)
                    print("🟢 Live Activity auto-dismissed")
                }
                print("🟢 Live Activity started: \(activity.id)")
                call.resolve(["id": activity.id])
            } catch {
                print("🔴 Live Activity failed: \(error)")
                call.reject("Failed to start Live Activity: \(error.localizedDescription)")
            }
        } else {
            call.reject("Live Activities require iOS 16.1+")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<RestTimerAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }
}
