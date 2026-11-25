import CmuxNextSettings
import Testing

/// `sidebar.showAgentSessions` is off by default so helper sessions stay out of the sidebar. The person can turn it
/// on from Settings, cmux.json, `cmux settings set` or Cmd+Shift+P, and invalid values keep the default.
struct SidebarShowAgentSessionsSettingTests {
    static func parse(_ value: JSONValue?) -> CmuxConfigSnapshot {
        let root: JSONValue = value.map { .object(["sidebar": .object(["showAgentSessions": $0])]) } ?? .object([:])
        return CmuxConfigSnapshot.parse(root, validDensities: [], validMetrics: [])
    }

    @Test func offByDefault() {
        let snapshot = Self.parse(nil)
        #expect(snapshot.sidebarSections.showAgentSessions == false)
        #expect(snapshot.diagnostics.isEmpty, "no key, no diagnostic: \(snapshot.diagnostics)")
    }

    @Test func theUserCanTurnItOnAndOff() {
        #expect(Self.parse(.bool(true)).sidebarSections.showAgentSessions)
        #expect(Self.parse(.bool(false)).sidebarSections.showAgentSessions == false)
    }

    @Test func aBadValueKeepsTheDefaultAndSaysWhy() {
        let snapshot = Self.parse(.string("on"))
        #expect(snapshot.sidebarSections.showAgentSessions == false)
        #expect(snapshot.diagnostics.contains { $0.path == "sidebar.showAgentSessions" }, "\(snapshot.diagnostics)")
    }

    @Test func settingsAndThePaletteListTheToggleOffByDefault() throws {
        let descriptor = try #require(SettingsSchema.descriptor(for: ["sidebar", "showAgentSessions"]))
        #expect(descriptor.defaultValue == .bool(false))
        #expect(descriptor.section == .appearance)
        #expect(descriptor.isPaletteExposed)
    }
}
