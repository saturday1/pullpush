import Capacitor

class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RestTimerPlugin())
        print("🟡 RestTimerPlugin registered via MyViewController")
    }
}
