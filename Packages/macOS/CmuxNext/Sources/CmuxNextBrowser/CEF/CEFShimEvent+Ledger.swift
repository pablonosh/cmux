import CmuxNextCompat

extension CEFShimEvent {
    /// The wake ledger's reason for this event (bench and Debug builds record every event the main thread takes,
    /// `cefEventCallback`): a DevTools message by its method (`devTools Page.lifecycleEvent`, or `devTools reply`),
    /// every other event by its case. A renderer's DevTools session messages reach the main thread through
    /// Chromium's I/O thread (cmux20-bench, 2026-11-25: 0.9/s at idle, `blink.mojom.DevToolsSessionHost`); this
    /// names them.
    var ledgerReason: String {
        switch self {
        case .devToolsMessage(_, let json):
            return "devTools " + (DevToolsMessageHead(json: json).method ?? "reply")
        case .unknown(let kind):
            return "unknown \(kind)"
        default:
            return Mirror(reflecting: self).children.first?.label ?? String(describing: self)
        }
    }
}
