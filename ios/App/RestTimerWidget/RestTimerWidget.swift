import ActivityKit
import WidgetKit
import SwiftUI

// RestTimerAttributes is defined in App/RestTimerAttributes.swift
// and added to this target's Compile Sources

struct RestTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestTimerAttributes.self) { context in
            // Lock screen banner
            HStack(spacing: 16) {
                Image(systemName: "timer")
                    .font(.title2)
                    .foregroundColor(.orange)

                
                VStack(alignment: .leading, spacing: 2) {
                    Text(NSLocalizedString("rest_label", bundle: .main, comment: ""))
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)

                    Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(.primary)
                }

                Spacer()
            }
            .padding()
            .background(Color(UIColor.systemBackground))

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    HStack(spacing: 12) {
                        Image(systemName: "timer")
                            .foregroundColor(.orange)
                        Text(NSLocalizedString("rest_label", bundle: .main, comment: ""))
                            .font(.caption)
                            .fontWeight(.bold)
                        Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundColor(.orange)
            } compactTrailing: {
                Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.semibold)
                    .monospacedDigit()
                    .frame(minWidth: 36)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundColor(.orange)
            }
        }
    }
}
