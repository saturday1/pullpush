import UIKit
import Capacitor
import ActivityKit
import AVFoundation

@objc(RestTimerPlugin)
public class RestTimerPlugin: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate {
    public let identifier = "RestTimerPlugin"
    public let jsName = "RestTimer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playSound", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setKeepAwake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleSound", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleSoundSequence", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelScheduledSounds", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWorkoutActive", returnType: CAPPluginReturnPromise),
    ]

    private var autoEndWorkItem: DispatchWorkItem?
    private var unduckWorkItem: DispatchWorkItem?
    private var scheduledWorkItems: [DispatchWorkItem] = []
    private var beepPlayer: AVAudioPlayer?
    private var goPlayer: AVAudioPlayer?
    private var restPlayer: AVAudioPlayer?
    private var restEndPlayer: AVAudioPlayer?
    private var numberPlayers: [String: AVAudioPlayer] = [:]
    private var keepAlivePlayer: AVAudioPlayer?

    private static let supabaseURL = "https://jfayqffmmkwjrbdanqsm.supabase.co"
    private static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYXlxZmZtbWt3anJiZGFucXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDU0OTQsImV4cCI6MjA4ODg4MTQ5NH0.IM4xu2MRouTAe5DkzWyBtPtekW7J2o6-aKej2vXBeBU"

    override public func load() {
        print("🟡 RestTimerPlugin loaded!")
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<RestTimerAttributes>.activities {
                    if activity.content.state.endTime < Date() {
                        await activity.end(nil, dismissalPolicy: .immediate)
                    }
                }
            }
        }

        // Audio players are created lazily on first playSound() to avoid
        // claiming the audio session at app launch (would interrupt Spotify)
    }

    private func ensureBeepPlayer() {
        if beepPlayer != nil { return }
        if let beepURL = Bundle.main.url(forResource: "beep", withExtension: "mp3") {
            beepPlayer = try? AVAudioPlayer(contentsOf: beepURL)
            beepPlayer?.delegate = self
            assertDuckingSession()
            beepPlayer?.prepareToPlay()
        } else {
            print("🔴 beep.mp3 not found in bundle")
        }
    }

    private func ensureGoPlayer() {
        if goPlayer != nil { return }
        if let goURL = Bundle.main.url(forResource: "go", withExtension: "mp3") {
            goPlayer = try? AVAudioPlayer(contentsOf: goURL)
            goPlayer?.delegate = self
            assertDuckingSession()
            goPlayer?.prepareToPlay()
        } else {
            print("🔴 go.mp3 not found in bundle")
        }
    }

    private func ensureRestPlayer() {
        if restPlayer != nil { return }
        if let url = Bundle.main.url(forResource: "rest", withExtension: "mp3") {
            restPlayer = try? AVAudioPlayer(contentsOf: url)
            restPlayer?.delegate = self
            assertDuckingSession()
            restPlayer?.prepareToPlay()
        } else {
            print("🔴 rest.mp3 not found in bundle")
        }
    }

    private func ensureRestEndPlayer() {
        if restEndPlayer != nil { return }
        if let url = Bundle.main.url(forResource: "rest_end", withExtension: "mp3") {
            restEndPlayer = try? AVAudioPlayer(contentsOf: url)
            restEndPlayer?.delegate = self
            assertDuckingSession()
            restEndPlayer?.prepareToPlay()
        } else {
            print("🔴 rest_end.mp3 not found in bundle")
        }
    }

    private func ensureNumberPlayer(_ name: String) {
        if numberPlayers[name] != nil { return }
        if let url = Bundle.main.url(forResource: name, withExtension: "mp3") {
            let p = try? AVAudioPlayer(contentsOf: url)
            p?.delegate = self
            assertDuckingSession()
            p?.prepareToPlay()
            numberPlayers[name] = p
        } else {
            print("🔴 \(name).mp3 not found in bundle")
        }
    }

    /// AVAudioPlayerDelegate: after any sound finishes, debounce un-ducking.
    /// If keep-alive is still playing (timer in progress), just remove ducking.
    /// Otherwise fully deactivate so Spotify gets notified to resume.
    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        unduckWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            do {
                if self.keepAlivePlayer?.isPlaying == true {
                    // Timer still active — keep session alive but remove ducking
                    try AVAudioSession.sharedInstance().setCategory(
                        .playback,
                        mode: .default,
                        options: [.mixWithOthers]
                    )
                } else {
                    try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
                    try AVAudioSession.sharedInstance().setCategory(
                        .ambient,
                        mode: .default,
                        options: [.mixWithOthers]
                    )
                }
            } catch {
                print("🔴 Audio session unduck failed: \(error)")
            }
        }
        unduckWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0, execute: work)
    }

    /// Re-assert ducking audio session (WKWebView may reset it)
    private func assertDuckingSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.duckOthers, .mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true, options: [])
        } catch {
            print("🔴 Audio session assertion failed: \(error)")
        }
    }

    /// Play a sound by name — used by both playSound and scheduleSound
    private func playByName(_ name: String) {
        unduckWorkItem?.cancel()
        switch name {
        case "tick":
            ensureBeepPlayer()
            assertDuckingSession()
            beepPlayer?.currentTime = 0
            beepPlayer?.play()
        case "go":
            ensureGoPlayer()
            assertDuckingSession()
            goPlayer?.currentTime = 0
            goPlayer?.play()
        case "rest":
            ensureRestPlayer()
            assertDuckingSession()
            restPlayer?.currentTime = 0
            restPlayer?.play()
        case "rest_end":
            ensureRestEndPlayer()
            assertDuckingSession()
            restEndPlayer?.currentTime = 0
            restEndPlayer?.play()
        case "one", "two", "three", "four", "five":
            ensureNumberPlayer(name)
            assertDuckingSession()
            numberPlayers[name]?.currentTime = 0
            numberPlayers[name]?.play()
        default:
            break
        }
    }

    @objc func playSound(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? ""
        playByName(name)
        call.resolve()
    }

    @objc func scheduleSound(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? ""
        let delayMs = call.getInt("delayMs") ?? 0
        let work = DispatchWorkItem { [weak self] in
            self?.playByName(name)
        }
        scheduledWorkItems.append(work)
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(delayMs), execute: work)
        call.resolve()
    }

    /// Schedule an entire sequence in ONE bridge call, with a JS reference time
    /// so bridge latency doesn't drift sounds against the JS clock.
    /// items: [{ name: string, delayMs: number }]
    /// startTime: JS Date.now() at plan start — native computes absolute deadlines from it
    @objc func scheduleSoundSequence(_ call: CAPPluginCall) {
        guard let items = call.getArray("items") as? [[String: Any]] else {
            call.resolve()
            return
        }
        let startTimeMs = (call.getDouble("startTime") ?? Date().timeIntervalSince1970 * 1000)
        let nowMs = Date().timeIntervalSince1970 * 1000

        for item in items {
            guard let name = item["name"] as? String else { continue }
            let delayMs = (item["delayMs"] as? Int) ?? 0
            let targetMs = startTimeMs + Double(delayMs)
            let fireInMs = max(0, targetMs - nowMs)
            let work = DispatchWorkItem { [weak self] in
                self?.playByName(name)
            }
            scheduledWorkItems.append(work)
            DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(Int(fireInMs)), execute: work)
        }
        call.resolve()
    }

    @objc func cancelScheduledSounds(_ call: CAPPluginCall) {
        for w in scheduledWorkItems { w.cancel() }
        scheduledWorkItems.removeAll()
        call.resolve()
    }

    /// Start a silent looping player to keep the app alive in background.
    /// Sets session to .playback + .mixWithOthers (no ducking) so Spotify
    /// keeps playing at full volume. Actual sound plays switch temporarily
    /// to .duckOthers, then the delegate removes ducking.
    private func startKeepAlive() {
        if keepAlivePlayer?.isPlaying == true { return }
        if keepAlivePlayer == nil, let url = Bundle.main.url(forResource: "silent", withExtension: "wav") {
            keepAlivePlayer = try? AVAudioPlayer(contentsOf: url)
            keepAlivePlayer?.numberOfLoops = -1
            // Near-silent but non-zero so iOS counts it as active audio (keeps app alive in background)
            keepAlivePlayer?.volume = 0.001
            // No delegate — don't trigger unduck logic
        }
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]  // no ducking — Spotify full volume
            )
            try AVAudioSession.sharedInstance().setActive(true, options: [])
        } catch {
            print("🔴 Keep-alive session setup failed: \(error)")
        }
        keepAlivePlayer?.play()
    }

    private func stopKeepAlive() {
        keepAlivePlayer?.stop()
        // Cancel any pending unduck — we're tearing down
        unduckWorkItem?.cancel()
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
            try AVAudioSession.sharedInstance().setCategory(
                .ambient,
                mode: .default,
                options: [.mixWithOthers]
            )
        } catch {
            print("🔴 Keep-alive teardown failed: \(error)")
        }
    }

    /// JS calls this when workoutId is set/cleared. Keeps silent audio running
    /// for the entire workout duration so iOS doesn't kill the app between sets.
    @objc func setWorkoutActive(_ call: CAPPluginCall) {
        let active = call.getBool("active") ?? false
        if active {
            startKeepAlive()
        } else {
            stopKeepAlive()
        }
        call.resolve()
    }

    @objc func setKeepAwake(_ call: CAPPluginCall) {
        let keep = call.getBool("keep") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = keep
        }
        call.resolve()
    }

    @objc func start(_ call: CAPPluginCall) {
        print("🟢 RestTimerPlugin.start() called")
        let seconds = call.getInt("seconds") ?? 90
        let label = call.getString("label") ?? "PULLPUSH"
        let endTimeMs = call.getValue("endTime") as? Double
        let endTime: Date = endTimeMs.map { Date(timeIntervalSince1970: $0 / 1000.0) }
            ?? Date().addingTimeInterval(TimeInterval(seconds))

        autoEndWorkItem?.cancel()

        if #available(iOS 16.2, *) {
            Task {
                for existing in Activity<RestTimerAttributes>.activities {
                    await existing.end(nil, dismissalPolicy: .immediate)
                }

                let attributes = RestTimerAttributes(totalSeconds: seconds, label: label)
                let state = RestTimerAttributes.ContentState(endTime: endTime)

                do {
                    let activity = try Activity.request(
                        attributes: attributes,
                        content: .init(state: state, staleDate: endTime),
                        pushType: nil
                    )
                    print("🟢 Live Activity started: \(activity.id)")

                    // Auto-end after timer expires (best effort if app still active)
                    let workItem = DispatchWorkItem {
                        Task {
                            for a in Activity<RestTimerAttributes>.activities {
                                await a.end(nil, dismissalPolicy: .immediate)
                            }
                        }
                    }
                    self.autoEndWorkItem = workItem
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(seconds) + 1.0, execute: workItem)

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
        // Cancel any scheduled sounds — keep-alive is controlled separately via setWorkoutActive
        for w in scheduledWorkItems { w.cancel() }
        scheduledWorkItems.removeAll()

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

    /// Send push token + end time to Supabase so the Edge Function can send APNs end-push
    private func registerPushToken(token: String, endTime: Date) {
        let iso = ISO8601DateFormatter().string(from: endTime)
        let json: [String: Any] = ["push_token": token, "end_time": iso]

        guard let body = try? JSONSerialization.data(withJSONObject: json),
              let url = URL(string: "\(Self.supabaseURL)/rest/v1/live_activity_tokens") else {
            print("🔴 Failed to build push token request")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Self.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(Self.supabaseAnonKey)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                print("🔴 Push token registration failed: \(error)")
            } else if let http = response as? HTTPURLResponse, http.statusCode < 300 {
                print("🟢 Push token registered for APNs end-push")
            } else {
                print("🔴 Push token registration error: \((response as? HTTPURLResponse)?.statusCode ?? -1)")
            }
        }.resume()
    }
}
