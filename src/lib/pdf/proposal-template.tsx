import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatDimensions } from "@/lib/dimensions";
import { formatCurrency } from "@/lib/pricing";
import type { ProposalSnapshot } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: "#666",
    marginBottom: 20,
  },
  propertyBlock: {
    marginBottom: 4,
  },
  propertyLabel: {
    fontSize: 9,
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  propertyValue: {
    fontSize: 12,
    marginBottom: 8,
  },
  satelliteSection: {
    marginTop: 20,
  },
  satelliteImage: {
    width: 480,
    maxHeight: 280,
    objectFit: "contain" as const,
    marginTop: 8,
  },
  satelliteCaption: {
    fontSize: 8,
    color: "#666",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    marginTop: 24,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  buildingHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    marginTop: 12,
  },
  surfaceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  surfaceRowAlt: {
    backgroundColor: "#f9f9f9",
  },
  surfaceName: {
    flex: 1,
    fontSize: 9,
  },
  surfaceDimensions: {
    width: 120,
    fontSize: 9,
    color: "#666",
    textAlign: "right",
  },
  surfaceSqft: {
    width: 80,
    fontSize: 9,
    textAlign: "right",
  },
  buildingTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  buildingTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  buildingTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f3f3f3",
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  scopeText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  lineItemRow: {
    fontSize: 9,
    color: "#444",
    paddingVertical: 1,
    paddingHorizontal: 8,
  },
  priceSection: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  priceValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  notesSection: {
    marginTop: 20,
  },
  notesText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
});

export function ProposalDocument({
  snapshot,
}: {
  snapshot: ProposalSnapshot;
}) {
  const allSurfaceNames = new Set<string>();
  for (const b of snapshot.buildings) {
    for (const s of b.surfaces) {
      allSurfaceNames.add(s.name);
    }
  }
  const scopeList = Array.from(allSurfaceNames).join(", ");

  const formattedDate = new Date(snapshot.generatedAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Proposal</Text>
          <Text style={styles.date}>{formattedDate}</Text>

          <View style={styles.propertyBlock}>
            <Text style={styles.propertyLabel}>Property</Text>
            <Text style={styles.propertyValue}>
              {snapshot.propertyName}
            </Text>
          </View>
          <View style={styles.propertyBlock}>
            <Text style={styles.propertyLabel}>Address</Text>
            <Text style={styles.propertyValue}>{snapshot.address}</Text>
          </View>
          <View style={styles.propertyBlock}>
            <Text style={styles.propertyLabel}>Prepared for</Text>
            <Text style={styles.propertyValue}>{snapshot.clientName}</Text>
          </View>
        </View>

        {snapshot.satelliteImageDataUri ? (
          <View style={styles.satelliteSection}>
            <Text style={styles.sectionTitle}>Property location</Text>
            <Image
              src={snapshot.satelliteImageDataUri}
              style={styles.satelliteImage}
            />
            <Text style={styles.satelliteCaption}>Map imagery © Google</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Building Breakdown</Text>

        {snapshot.buildings.map((building, bi) => (
          <View key={bi} wrap={false}>
            <Text style={styles.buildingHeader}>
              {building.label}
              {building.count > 1 ? ` (x${building.count})` : ""}
            </Text>

            {building.surfaces.map((surface, si) => (
              <View
                key={si}
                style={
                  si % 2 === 1
                    ? [styles.surfaceRow, styles.surfaceRowAlt]
                    : styles.surfaceRow
                }
              >
                <Text style={styles.surfaceName}>{surface.name}</Text>
                <Text style={styles.surfaceDimensions}>
                  {formatDimensions(surface.dimensions)}
                </Text>
                <Text style={styles.surfaceSqft}>
                  {surface.totalSqft.toLocaleString()} sqft
                </Text>
              </View>
            ))}

            <View style={styles.buildingTotal}>
              <Text style={styles.buildingTotalLabel}>
                Building total
              </Text>
              <Text style={styles.buildingTotalValue}>
                {building.totalSqft.toLocaleString()} sqft
              </Text>
            </View>
            {building.count > 1 && (
              <View
                style={[styles.buildingTotal, { borderTopWidth: 0 }]}
              >
                <Text style={styles.buildingTotalLabel}>
                  x {building.count} buildings
                </Text>
                <Text style={styles.buildingTotalValue}>
                  {(building.totalSqft * building.count).toLocaleString()}{" "}
                  sqft
                </Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Total Area</Text>
          <Text style={styles.grandTotalValue}>
            {snapshot.totalSqft.toLocaleString()} sqft
          </Text>
        </View>

        {scopeList && (
          <>
            <Text style={styles.sectionTitle}>Scope Includes</Text>
            <Text style={styles.scopeText}>{scopeList}</Text>
          </>
        )}

        {snapshot.lineItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Additional Items</Text>
            {snapshot.lineItems.map((item, i) => (
              <Text key={i} style={styles.lineItemRow}>
                {item.name}
              </Text>
            ))}
          </>
        )}

        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.priceValue}>
            {formatCurrency(snapshot.grandTotal)}
          </Text>
        </View>

        {snapshot.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{snapshot.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Generated by Mercer — {formattedDate}
        </Text>
      </Page>
    </Document>
  );
}
