import Foundation
import ActivityKit

struct RestTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var endTime: Date
    }
    var totalSeconds: Int
}
