import Capacitor

class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RestTimerPlugin())
        bridge?.registerPluginInstance(BarcodeScannerPlugin())
        print("🟡 RestTimerPlugin + BarcodeScannerPlugin registered via MyViewController")
    }
}
