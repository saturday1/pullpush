import ActivityKit
import WidgetKit
import SwiftUI

// RestTimerAttributes is defined in App/RestTimerAttributes.swift
// and added to this target's Compile Sources

struct RestTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestTimerAttributes.self) { context in
            let startTime = context.state.endTime.addingTimeInterval(-Double(context.attributes.totalSeconds))

            // Lock screen banner
            VStack(spacing: 10) {
                HStack(spacing: 16) {
                    Image("PullPushLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 32, height: 32)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.label.uppercased())
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                            .fixedSize(horizontal: false, vertical: true)

                        Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundColor(.primary)
                    }

                    Spacer()
                }

                ProgressView(timerInterval: startTime...context.state.endTime, countsDown: true) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .progressViewStyle(.linear)
                .tint(.white)
                .scaleEffect(y: 1.5)
                .clipShape(Capsule())
            }
            .padding()
            .background(Color(UIColor.systemBackground))

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    HStack(spacing: 10) {
                        Image("PullPushLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 20, height: 20)
                        Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                }
            } compactLeading: {
                Image("PullPushLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 14, height: 14)
            } compactTrailing: {
                Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                    .font(.caption2)
                    .fontWeight(.bold)
                    .monospacedDigit()
                    .frame(width: 36)
            } minimal: {
                Image("PullPushLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 14, height: 14)
            }
        }
    }
}
