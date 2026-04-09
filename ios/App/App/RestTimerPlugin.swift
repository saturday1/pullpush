import UIKit
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
        // Reset idle timer on app start
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = false }
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
        let label = call.getString("label") ?? "PULLPUSH"

        // Keep screen on during timer
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = true }

        if #available(iOS 16.2, *) {
            Task {
                // End ALL existing activities and wait before starting new one
                for existing in Activity<RestTimerAttributes>.activities {
                    await existing.end(nil, dismissalPolicy: .immediate)
                }

                let attributes = RestTimerAttributes(totalSeconds: seconds, label: label)
                let endTime = Date().addingTimeInterval(TimeInterval(seconds))
                let state = RestTimerAttributes.ContentState(endTime: endTime)

                do {
                    let activity = try Activity.request(
                        attributes: attributes,
                        content: .init(state: state, staleDate: endTime),
                        pushType: nil
                    )
                    print("🟢 Live Activity started: \(activity.id)")
                    call.resolve(["id": activity.id])
                } catch {
                    print("🔴 Live Activity failed: \(error)")
                    call.reject("Failed: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("Live Activities require iOS 16.1+")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        // Allow screen to sleep again
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = false }

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
