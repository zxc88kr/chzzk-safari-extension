//
//  ViewController.swift
//  Chzzk Safari Extension
//
//  Created by 박찬 on 2026. 8. 23..
//

import Cocoa
import SafariServices
import WebKit

let extensionBundleIdentifier = "dev.zxc88kr.chzzk-safari-extension.Extension"

class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show(\(state.isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show(\(state.isEnabled), false)")
                }

                // 설치 직후(install.sh 가 --open-prefs 로 실행)이고 아직 꺼져 있으면
                // Safari 확장 설정을 바로 열어준다. 이미 켜져 있으면 방해하지 않는다.
                if CommandLine.arguments.contains("--open-prefs") && !state.isEnabled {
                    self.openExtensionPreferences()
                }
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if (message.body as! String != "open-preferences") {
            return;
        }

        openExtensionPreferences()
    }

    private func openExtensionPreferences() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            DispatchQueue.main.async {
                NSApplication.shared.terminate(nil)
            }
        }
    }

}
