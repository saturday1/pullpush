import ActivityKit
import WidgetKit
import SwiftUI

// RestTimerAttributes is defined in App/RestTimerAttributes.swift
// and added to this target's Compile Sources

struct RestTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestTimerAttributes.self) { context in
            let startTime = context.state.endTime.addingTimeInterval(-Double(context.attributes.totalSeconds))
            let isExpired = context.state.endTime < Date()
            let isPaused = context.state.isPaused
            let pausedSecs = Int(context.state.pausedSecondsRemaining)
            let pausedFormatted = String(format: "%d:%02d", pausedSecs / 60, pausedSecs % 60)

            // Lock screen banner
            VStack(spacing: 10) {
                HStack(spacing: 16) {
                    Image("PullPushLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 56, height: 56)

                    VStack(alignment: .leading, spacing: 4) {
                        if isExpired {
                            Text("✓ KLAR")
                                .font(.system(size: 24, weight: .bold, design: .rounded))
                                .foregroundColor(.green)
                        } else {
                            Text(context.attributes.label.uppercased())
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.primary.opacity(0.85))
                                .lineLimit(3)
                                .fixedSize(horizontal: false, vertical: true)
                                .multilineTextAlignment(.leading)

                            if isPaused {
                                HStack(spacing: 6) {
                                    Image(systemName: "pause.fill")
                                        .font(.system(size: 20))
                                        .foregroundColor(.primary.opacity(0.5))
                                    Text(pausedFormatted)
                                        .font(.system(size: 32, weight: .bold, design: .rounded))
                                        .monospacedDigit()
                                        .foregroundColor(.primary.opacity(0.5))
                                }
                            } else {
                                Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                                    .font(.system(size: 32, weight: .bold, design: .rounded))
                                    .monospacedDigit()
                                    .foregroundColor(.primary)
                            }
                        }
                    }

                    Spacer()
                }

                if !isExpired {
                    if isPaused {
                        let fraction = context.attributes.totalSeconds > 0
                            ? context.state.pausedSecondsRemaining / Double(context.attributes.totalSeconds)
                            : 0
                        ProgressView(value: fraction)
                            .progressViewStyle(.linear)
                            .tint(.white.opacity(0.5))
                            .scaleEffect(y: 1.5)
                            .clipShape(Capsule())
                    } else {
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
                }
            }
            .padding()
            .background(Color(UIColor.systemBackground))

        } dynamicIsland: { context in
            let isPaused = context.state.isPaused
            let pausedSecs = Int(context.state.pausedSecondsRemaining)
            let pausedFormatted = String(format: "%d:%02d", pausedSecs / 60, pausedSecs % 60)

            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    HStack(spacing: 10) {
                        Image("PullPushLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 20, height: 20)
                        if isPaused {
                            HStack(spacing: 4) {
                                Image(systemName: "pause.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(.primary.opacity(0.5))
                                Text(pausedFormatted)
                                    .font(.system(size: 24, weight: .bold, design: .rounded))
                                    .monospacedDigit()
                                    .foregroundColor(.primary.opacity(0.5))
                            }
                        } else {
                            Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                                .font(.system(size: 24, weight: .bold, design: .rounded))
                                .monospacedDigit()
                        }
                    }
                }
            } compactLeading: {
                Image("PullPushLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 14, height: 14)
            } compactTrailing: {
                if isPaused {
                    Image(systemName: "pause.fill")
                        .font(.caption2)
                        .foregroundColor(.primary.opacity(0.5))
                } else {
                    Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                        .font(.caption2)
                        .fontWeight(.bold)
                        .monospacedDigit()
                        .frame(width: 36)
                }
            } minimal: {
                Image("PullPushLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 14, height: 14)
            }
        }
    }
}
