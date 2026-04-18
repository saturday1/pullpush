import UIKit
import Capacitor
import ActivityKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var bgTaskID: UIBackgroundTaskIdentifier = .invalid

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Clean up any stale Live Activities
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<RestTimerAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
            }
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Request background time to auto-end Live Activities when their timer expires
        if #available(iOS 16.2, *) {
            let activities = Activity<RestTimerAttributes>.activities
            guard !activities.isEmpty else { return }

            // Find the latest end time among active activities
            let latestEnd = activities.compactMap({ $0.content.state.endTime }).max() ?? Date()
            let secondsUntilEnd = latestEnd.timeIntervalSinceNow + 1.0
            guard secondsUntilEnd > 0 else { return }

            bgTaskID = application.beginBackgroundTask(withName: "EndLiveActivity") { [weak self] in
                guard let self = self else { return }
                if self.bgTaskID != .invalid {
                    application.endBackgroundTask(self.bgTaskID)
                    self.bgTaskID = .invalid
                }
            }

            // Poll every 2s to check if activities have expired
            func pollExpired() {
                Task {
                    var hasActive = false
                    for activity in Activity<RestTimerAttributes>.activities {
                        if activity.content.state.endTime < Date() {
                            await activity.end(nil, dismissalPolicy: .immediate)
                        } else {
                            hasActive = true
                        }
                    }
                    if hasActive {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                            pollExpired()
                        }
                    } else if self.bgTaskID != .invalid {
                        application.endBackgroundTask(self.bgTaskID)
                        self.bgTaskID = .invalid
                    }
                }
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                pollExpired()
            }
        }
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Clean up expired Live Activities when app becomes active (e.g., user unlocks phone)
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

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
