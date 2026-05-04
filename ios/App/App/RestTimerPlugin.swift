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
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
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

        // Pre-create all players without activating audio session (deferred one run loop
        // so app finishes launching first). This avoids Spotify interruption at launch
        // while ensuring players are ready by the time the user presses play.
        DispatchQueue.main.async {
            self.preloadAllPlayers()
        }
    }

    /// Create all players (file I/O + prepareToPlay) without activating audio session.
    /// Called at load time so players are ready before first use.
    private func preloadAllPlayers() {
        func make(_ resource: String, _ ext: String = "mp3") -> AVAudioPlayer? {
            guard let url = Bundle.main.url(forResource: resource, withExtension: ext) else { return nil }
            let p = try? AVAudioPlayer(contentsOf: url)
            p?.delegate = self
            p?.prepareToPlay()
            return p
        }
        if beepPlayer == nil    { beepPlayer    = make("beep") }
        if goPlayer == nil      { goPlayer      = make("go") }
        if restPlayer == nil    { restPlayer    = make("rest") }
        if restEndPlayer == nil { restEndPlayer = make("rest_end") }
        for name in ["one", "two", "three", "four", "five"] {
            if numberPlayers[name] == nil { numberPlayers[name] = make(name) }
        }
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
                    // Timer still active — keep ducking so next sound fires immediately
                    // (removing .duckOthers here caused 500ms+ delay on next assertDuckingSession)
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

    /// Re-assert ducking audio session (WKWebView may reset it).
    /// When keepAlive is playing the session is already active — skip setActive(true)
    /// because the first call to setActive incurs ~500ms IPC overhead even on an
    /// already-active session, which delays the first sound in a set.
    private func assertDuckingSession() {
        let session = AVAudioSession.sharedInstance()
        let t0 = Date().timeIntervalSince1970
        do {
            let needsCategory = !session.categoryOptions.contains(.duckOthers)
            if needsCategory {
                try session.setCategory(.playback, mode: .default, options: [.duckOthers, .mixWithOthers])
                try session.setActive(true, options: [])
            } else if keepAlivePlayer?.isPlaying != true {
                // Category fine but session may be inactive (no keepAlive running)
                try session.setActive(true, options: [])
            }
            // If .duckOthers is set AND keepAlive is playing: session is already active, skip.
            let ms = Int((Date().timeIntervalSince1970 - t0) * 1000)
            if ms > 20 { print("⏱️ assertDuckingSession: \(ms)ms") }
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
            let tA = Date().timeIntervalSince1970 * 1000
            assertDuckingSession()
            let tB = Date().timeIntervalSince1970 * 1000
            numberPlayers[name]?.currentTime = 0
            let tC = Date().timeIntervalSince1970 * 1000
            numberPlayers[name]?.play()
            let tD = Date().timeIntervalSince1970 * 1000
            print("⏱️ playByName(\(name)): assertDuck=\(Int(tB-tA))ms currentTime=\(Int(tC-tB))ms play=\(Int(tD-tC))ms")
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
        let nowMs = Date().timeIntervalSince1970 * 1000
        let startTimeMs = call.getDouble("startTime") ?? nowMs
        print("⏱️ scheduleSoundSequence lag: \(Int(nowMs - startTimeMs))ms")

        let session = AVAudioSession.sharedInstance()
        let needsWarmup = !session.categoryOptions.contains(.duckOthers)
        let warmupMs = needsWarmup ? 300.0 : 0.0
        if needsWarmup {
            DispatchQueue.global(qos: .userInteractive).async { [weak self] in
                self?.assertDuckingSession()
            }
        }

        for item in items {
            guard let name = item["name"] as? String else { continue }
            let delayMs = (item["delayMs"] as? Int) ?? 0
            let targetMs = startTimeMs + Double(delayMs)
            let fireInMs = max(warmupMs, max(0, targetMs - nowMs))
            let scheduledAt = nowMs
            let work = DispatchWorkItem { [weak self] in
                let firedAt = Date().timeIntervalSince1970 * 1000
                let drift = Int(firedAt - scheduledAt - fireInMs)
                if drift > 50 { print("⏱️ work item '\(name)' fired \(drift)ms late (fireInMs=\(Int(fireInMs)))") }
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
    /// Session setup runs on a background thread so the main thread is not blocked
    /// (setCategory IPC with mediaserverd takes 200-800ms and would delay scheduled sounds).
    /// Calls completion on the main thread once the session is ready.
    private func startKeepAlive(completion: (() -> Void)? = nil) {
        if keepAlivePlayer?.isPlaying == true {
            completion?()
            return
        }
        if keepAlivePlayer == nil, let url = Bundle.main.url(forResource: "silent", withExtension: "wav") {
            keepAlivePlayer = try? AVAudioPlayer(contentsOf: url)
            keepAlivePlayer?.numberOfLoops = -1
            keepAlivePlayer?.volume = 0.001
        }
        let player = keepAlivePlayer
        DispatchQueue.global(qos: .userInteractive).async {
            do {
                try AVAudioSession.sharedInstance().setCategory(
                    .playback,
                    mode: .default,
                    options: [.duckOthers, .mixWithOthers]
                )
                try AVAudioSession.sharedInstance().setActive(true, options: [])
            } catch {
                print("🔴 Keep-alive session setup failed: \(error)")
            }
            DispatchQueue.main.async {
                player?.play()
                completion?()
            }
        }
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
    /// When active=true, resolves only after the audio session is ready so that
    /// JS can await this before scheduling sounds (guarantees session is warm).
    @objc func setWorkoutActive(_ call: CAPPluginCall) {
        let active = call.getBool("active") ?? false
        if active {
            startKeepAlive {
                call.resolve()
            }
        } else {
            stopKeepAlive()
            call.resolve()
        }
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
        // Resolve immediately so JS-side await unblocks before Live Activity creation
        // (Activity.request takes 0.5–2 s; blocking the bridge delays scheduleSoundSequence
        // and makes all early countdown sounds collapse to fireInMs=0).
        call.resolve()

        if #available(iOS 16.2, *) {
            Task {
                for existing in Activity<RestTimerAttributes>.activities {
                    await existing.end(nil, dismissalPolicy: .immediate)
                }

                let attributes = RestTimerAttributes(totalSeconds: seconds, label: label)
                let state = RestTimerAttributes.ContentState(endTime: endTime, isPaused: false, pausedSecondsRemaining: 0)

                do {
                    let activity = try Activity.request(
                        attributes: attributes,
                        content: .init(state: state, staleDate: endTime),
                        pushType: nil
                    )
                    print("🟢 Live Activity started: \(activity.id)")

                    let workItem = DispatchWorkItem {
                        Task {
                            for a in Activity<RestTimerAttributes>.activities {
                                await a.end(nil, dismissalPolicy: .immediate)
                            }
                        }
                    }
                    self.autoEndWorkItem = workItem
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(seconds) + 1.0, execute: workItem)
                } catch {
                    print("🔴 Live Activity failed: \(error)")
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        for w in scheduledWorkItems { w.cancel() }
        scheduledWorkItems.removeAll()
        call.resolve()
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<RestTimerAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
            }
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<RestTimerAttributes>.activities {
                    let remaining = max(0, activity.content.state.endTime.timeIntervalSinceNow)
                    let newState = RestTimerAttributes.ContentState(
                        endTime: activity.content.state.endTime,
                        isPaused: true,
                        pausedSecondsRemaining: remaining
                    )
                    await activity.update(.init(state: newState, staleDate: nil))
                }
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        let secondsRemaining = call.getDouble("seconds") ?? 0
        let endTimeMs = call.getValue("endTime") as? Double
        let endTime: Date = endTimeMs.map { Date(timeIntervalSince1970: $0 / 1000.0) }
            ?? Date().addingTimeInterval(secondsRemaining)

        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<RestTimerAttributes>.activities {
                    let newState = RestTimerAttributes.ContentState(
                        endTime: endTime,
                        isPaused: false,
                        pausedSecondsRemaining: 0
                    )
                    await activity.update(.init(state: newState, staleDate: endTime))
                }
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }

}
