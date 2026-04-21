import Foundation
import ActivityKit

struct RestTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var endTime: Date
        var isPaused: Bool
        var pausedSecondsRemaining: Double
    }
    var totalSeconds: Int
    var label: String
}
