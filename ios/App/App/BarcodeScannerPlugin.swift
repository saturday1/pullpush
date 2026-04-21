import UIKit
import Capacitor
import AVFoundation

@objc(BarcodeScannerPlugin)
public class BarcodeScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BarcodeScannerPlugin"
    public let jsName = "BarcodeScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise),
    ]

    @objc func scan(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            let vc = BarcodeScannerViewController()
            vc.modalPresentationStyle = .fullScreen
            vc.onResult = { barcode in
                call.resolve(["value": barcode])
            }
            vc.onCancel = {
                call.reject("cancelled")
            }
            self?.bridge?.viewController?.present(vc, animated: true)
        }
    }
}

// MARK: - BarcodeScannerViewController

class BarcodeScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onResult: ((String) -> Void)?
    var onCancel: (() -> Void)?

    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var didFind = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupCamera()
        setupUI()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        session.stopRunning()
    }

    private func setupCamera() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            onCancel?()
            dismiss(animated: true)
            return
        }

        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [
            .ean8, .ean13, .upce, .qr, .code128, .code39, .dataMatrix, .pdf417
        ]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.addSublayer(preview)
        previewLayer = preview

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    private func setupUI() {
        // Viewfinder
        let finder = UIView()
        finder.translatesAutoresizingMaskIntoConstraints = false
        finder.layer.borderColor = UIColor.white.cgColor
        finder.layer.borderWidth = 2
        finder.layer.cornerRadius = 12
        view.addSubview(finder)

        // Cancel button
        var config = UIButton.Configuration.filled()
        config.title = "Avbryt"
        config.attributedTitle = AttributedString("Avbryt", attributes: AttributeContainer([.font: UIFont.systemFont(ofSize: 17, weight: .semibold)]))
        config.baseForegroundColor = .white
        config.baseBackgroundColor = UIColor(white: 0, alpha: 0.5)
        config.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 28, bottom: 10, trailing: 28)
        let cancel = UIButton(configuration: config)
        cancel.layer.cornerRadius = 22
        cancel.clipsToBounds = true
        cancel.translatesAutoresizingMaskIntoConstraints = false
        cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        view.addSubview(cancel)

        NSLayoutConstraint.activate([
            finder.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            finder.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -40),
            finder.widthAnchor.constraint(equalToConstant: 260),
            finder.heightAnchor.constraint(equalToConstant: 160),

            cancel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            cancel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -40),
        ])
    }

    @objc private func cancelTapped() {
        dismiss(animated: true) { [weak self] in
            self?.onCancel?()
        }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !didFind,
              let obj = objects.first as? AVMetadataMachineReadableCodeObject,
              let value = obj.stringValue else { return }
        didFind = true
        session.stopRunning()
        dismiss(animated: true) { [weak self] in
            self?.onResult?(value)
        }
    }
}
