@testable import CmuxNextBrowser
import Testing

/// The app's main thread at idle (cmux20-bench, 2026-11-25, step a68e49e3): 0.58 wakes/s were Chromium's I/O thread
/// asking the main thread for work, and a trace named the messages it forwarded: DevTools protocol messages from a
/// renderer (`blink.mojom.DevToolsSessionHost`, 0.9/s). Bench builds put each shim event the main thread takes in the
/// wake ledger by kind, a DevTools message by its method, so `debug.wakeups` names what a page's session sends.
@Suite struct CEFShimEventLedgerTests {
    @Test func aDevToolsEventIsNamedByItsMethod() {
        let event = CEFShimEvent(kind: 32, browser: 3, request: 0, a: 0, b: 0,
                                 s1: #"{"method":"Page.frameStoppedLoading","params":{}}"#, s2: "")
        #expect(event.ledgerReason == "devTools Page.frameStoppedLoading")
    }

    @Test func aDevToolsReplyIsNamedAsOne() {
        let event = CEFShimEvent(kind: 32, browser: 3, request: 0, a: 0, b: 0, s1: #"{"id":1073741825,"result":{}}"#, s2: "")
        #expect(event.ledgerReason == "devTools reply")
    }

    @Test func otherEventsAreNamedByTheirCase() {
        let event = CEFShimEvent(kind: 52, browser: 3, request: 9, a: 1, b: 0, s1: "example.com", s2: "r")
        #expect(event.ledgerReason == "authPrompt")
        #expect(CEFShimEvent(kind: 9999, browser: 0, request: 0, a: 0, b: 0, s1: "", s2: "").ledgerReason == "unknown 9999")
    }
}
