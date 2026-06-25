import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Svg, Polygon, Line, Circle, Image } from '@react-pdf/renderer'
import type { PdfData } from '@/app/therapist/actions/pdf-data'
import path from 'path'

// ── Font registration (Vietnamese glyphs) ───────────────────────────────────
const fontsDir = path.join(process.cwd(), 'public', 'fonts')
const logoPath = path.join(process.cwd(), 'public', 'logo_header.png')
Font.register({ family: 'NotoSans', fonts: [
  { src: path.join(fontsDir, 'NotoSans-Regular.ttf'), fontWeight: 'normal' },
  { src: path.join(fontsDir, 'NotoSans-Medium.ttf'), fontWeight: 500 },
  { src: path.join(fontsDir, 'NotoSans-Bold.ttf'), fontWeight: 'bold' },
]})

const BRAND  = '#173404'
const GREEN  = '#4A8A60'
const RED    = '#B83030'
const GOLD   = '#C87020'
const INK    = '#1a1a1a'
const INK2   = '#555'
const INK3   = '#888'
const RULE   = '#e0e0e0'
const BG     = '#f8f7f5'

const LAYER_COLORS: Record<string, string> = {
  L0:'#8B1A1A',L1:'#A02020',L2:'#B83030',L3:'#C55030',
  L4:'#C87020',L5:'#4A8A60',L6:'#2A6A9A',L7:'#3A5AAA',
}

const s = StyleSheet.create({
  page:       { fontFamily: 'NotoSans', fontSize: 9, color: INK, paddingTop: 0, paddingBottom: 40, paddingHorizontal: 36 },
  header:     { backgroundColor: BRAND, marginHorizontal: -36, marginTop: 0, paddingVertical: 14, paddingHorizontal: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  headerSub:  { color: '#ffffffcc', fontSize: 8 },
  footer:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BRAND, paddingVertical: 6, paddingHorizontal: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { color: '#ffffffcc', fontSize: 7 },
  section:    { marginTop: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: BRAND, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: RULE, paddingBottom: 3 },
  metaRow:    { flexDirection: 'row', marginBottom: 3 },
  metaLabel:  { fontSize: 8, color: INK3, width: 90 },
  metaValue:  { fontSize: 9, fontWeight: 500 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: RULE },
  compBox:    { width: '48%', borderWidth: 1, borderColor: RULE, borderRadius: 6, padding: 10, backgroundColor: '#fff' },
  compTotal:  { fontSize: 22, fontWeight: 'bold' },
  compStage:  { fontSize: 10, color: INK2, marginTop: 2 },
  arrow:      { width: '4%', textAlign: 'center' as const, fontSize: 16, color: GREEN },
  tableHeader:{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: INK, marginBottom: 2 },
  tableHeaderText: { fontSize: 8, fontWeight: 'bold', color: INK2 },
  tableRow:   { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: RULE },
  tableCell:  { fontSize: 9 },
  noteBlock:  { marginBottom: 6 },
  noteLabel:  { fontSize: 8, fontWeight: 'bold', color: BRAND },
  noteText:   { fontSize: 8, color: INK2, marginTop: 1 },
  recItem:    { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-start' },
  recDot:     { width: 6, height: 6, borderRadius: 3, marginRight: 6, marginTop: 2 },
  msItem:     { marginBottom: 4, paddingLeft: 8 },
  msStage:    { fontSize: 8, fontWeight: 'bold', color: GREEN },
  msDesc:     { fontSize: 8, color: INK2, marginTop: 1 },
})

// ── Radar chart (8-axis) ────────────────────────────────────────────────────
function RadarChart({ baseline, target, layerIds }: {
  baseline: Record<string, number>; target: Record<string, number>; layerIds: string[]
}) {
  const cx = 130, cy = 115, R = 90
  const n = layerIds.length
  const maxVal = 4.0

  function polarToXY(i: number, val: number): [number, number] {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (val / maxVal) * R
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }

  function polyPoints(scores: Record<string, number>): string {
    return layerIds.map((lid, i) => {
      const [x, y] = polarToXY(i, Math.min(maxVal, scores[lid] ?? 0))
      return `${x},${y}`
    }).join(' ')
  }

  const gridLevels = [1, 2, 3, 4]

  return (
    <Svg width={260} height={240} viewBox="0 0 260 240">
      {/* Grid circles */}
      {gridLevels.map(lv => {
        const pts = layerIds.map((_, i) => {
          const [x, y] = polarToXY(i, lv)
          return `${x},${y}`
        }).join(' ')
        return <Polygon key={lv} points={pts} stroke="#ddd" strokeWidth={0.5} fill="none" />
      })}

      {/* Axis lines */}
      {layerIds.map((_, i) => {
        const [x, y] = polarToXY(i, maxVal)
        return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#ddd" strokeWidth={0.5} />
      })}

      {/* Baseline polygon */}
      <Polygon points={polyPoints(baseline)} fill="#B8303033" stroke={RED} strokeWidth={1.5} />

      {/* Target polygon */}
      <Polygon points={polyPoints(target)} fill="#4A8A6033" stroke={GREEN} strokeWidth={1.5} />

      {/* Axis labels */}
      {layerIds.map((lid, i) => {
        const [x, y] = polarToXY(i, maxVal + 0.6)
        return (
          <React.Fragment key={lid}>
            <Circle cx={x} cy={y} r={0} />
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// ── Pyramid chart ───────────────────────────────────────────────────────────
function PyramidChart({ layers }: {
  layers: Array<{ id: string; label: string; baselineScore: number; targetScore: number }>
}) {
  const barH = 18, gap = 3, maxW = 200, maxVal = 4.0, labelW = 80
  const totalH = layers.length * (barH + gap)

  return (
    <Svg width={340} height={totalH} viewBox={`0 0 340 ${totalH}`}>
      {layers.slice().reverse().map((layer, i) => {
        const y = i * (barH + gap)
        const bw = Math.max(2, (layer.baselineScore / maxVal) * maxW)
        const tw = Math.max(2, (layer.targetScore / maxVal) * maxW)
        const color = LAYER_COLORS[layer.id] ?? '#888'
        return (
          <React.Fragment key={layer.id}>
            {/* Baseline bar */}
            <Polygon
              points={`${labelW},${y} ${labelW + bw},${y} ${labelW + bw},${y + barH} ${labelW},${y + barH}`}
              fill={color} opacity={0.4}
            />
            {/* Target gain overlay */}
            {tw > bw && (
              <Polygon
                points={`${labelW + bw},${y} ${labelW + tw},${y} ${labelW + tw},${y + barH} ${labelW + bw},${y + barH}`}
                fill={color} opacity={0.8}
              />
            )}
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// ── Main Document ───────────────────────────────────────────────────────────
export function CyclePdfDocument({ data }: { data: PdfData }) {
  const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']
  const LAYER_VN: Record<string, string> = {
    L0:'Sinh học',L1:'Thần kinh',L2:'Giác quan',L3:'Vận động',
    L4:'Xử lý',L5:'Giao tiếp',L6:'QL Cuộc sống',L7:'Học thuật',
  }

  return (
    <Document>
      {/* ═══ TRANG 1 — Tổng quan ═══ */}
      <Page size="A4" style={s.page}>
        {/* ① Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image src={logoPath} style={{ width: 36, height: 36 }} />
            <View>
              <Text style={s.headerText}>SPEDUMAP</Text>
              <Text style={s.headerSub}>Developmental Mapping System</Text>
            </View>
          </View>
          <Text style={s.headerSub}>Báo cáo đánh giá phát triển</Text>
        </View>

        {/* ② Metadata */}
        <View style={s.section}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Họ tên trẻ:</Text>
            <Text style={s.metaValue}>{data.childName}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Tuổi:</Text>
            <Text style={s.metaValue}>{data.childAge}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Ngày đánh giá:</Text>
            <Text style={s.metaValue}>{data.evalDate}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Chu kỳ:</Text>
            <Text style={s.metaValue}>{data.cycleName}</Text>
          </View>
        </View>

        {/* ③ Baseline ↔ Target */}
        <View style={[s.section, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={s.compBox}>
            <Text style={{ fontSize: 8, color: INK3, marginBottom: 4 }}>BASELINE (Đánh giá ban đầu)</Text>
            <Text style={[s.compTotal, { color: RED }]}>{data.baselineResult.total.toFixed(1)}</Text>
            <Text style={s.compStage}>Giai đoạn: {data.baselineResult.stage}</Text>
          </View>
          <Text style={s.arrow}>→</Text>
          <View style={s.compBox}>
            <Text style={{ fontSize: 8, color: INK3, marginBottom: 4 }}>TARGET (Mục tiêu)</Text>
            <Text style={[s.compTotal, { color: GREEN }]}>{data.targetResult.total.toFixed(1)}</Text>
            <Text style={s.compStage}>Giai đoạn: {data.targetResult.stage}</Text>
          </View>
        </View>

        {/* ④ Radar chart */}
        <View style={[s.section, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 8, color: INK3, marginBottom: 4 }}>
            Biểu đồ 8 tầng: ■ Baseline (đỏ) vs ■ Target (xanh)
          </Text>
          <RadarChart
            baseline={data.baselineResult.layerScores}
            target={data.targetResult.layerScores}
            layerIds={LAYER_IDS}
          />
          {/* Radar labels (text outside Svg for Vietnamese rendering) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 4, gap: 4 }}>
            {LAYER_IDS.map(lid => (
              <Text key={lid} style={{ fontSize: 7, color: LAYER_COLORS[lid], marginHorizontal: 4 }}>
                {lid}: {LAYER_VN[lid]}
              </Text>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>SPEDUMAP · spedumax.com</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ═══ TRANG 2 — Chi tiết ═══ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image src={logoPath} style={{ width: 28, height: 28 }} />
            <Text style={s.headerText}>SPEDUMAP</Text>
          </View>
          <Text style={s.headerSub}>Chi tiết đánh giá</Text>
        </View>

        {/* ⑤ Layer score table */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Bảng điểm 8 tầng phát triển</Text>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, { width: '40%' }]}>Tầng</Text>
            <Text style={[s.tableHeaderText, { width: '20%', textAlign: 'center' as const }]}>Baseline</Text>
            <Text style={[s.tableHeaderText, { width: '20%', textAlign: 'center' as const }]}>Target</Text>
            <Text style={[s.tableHeaderText, { width: '20%', textAlign: 'center' as const }]}>Δ</Text>
          </View>
          {data.layerTable.map(row => {
            const delta = row.targetScore - row.baselineScore
            return (
              <View key={row.id} style={s.tableRow}>
                <Text style={[s.tableCell, { width: '40%', color: LAYER_COLORS[row.id] ?? INK }]}>{row.label}</Text>
                <Text style={[s.tableCell, { width: '20%', textAlign: 'center' as const }]}>{row.baselineScore.toFixed(2)}</Text>
                <Text style={[s.tableCell, { width: '20%', textAlign: 'center' as const }]}>{row.targetScore.toFixed(2)}</Text>
                <Text style={[s.tableCell, { width: '20%', textAlign: 'center' as const, color: delta > 0 ? GREEN : INK3 }]}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Pyramid */}
        <View style={[s.section, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 8, color: INK3, marginBottom: 6 }}>
            Kim tự tháp phát triển (sáng = baseline, đậm = target gain)
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Layer labels for pyramid */}
            <View style={{ width: 80, paddingTop: 2 }}>
              {data.layerTable.slice().reverse().map(row => (
                <Text key={row.id} style={{ fontSize: 7, color: LAYER_COLORS[row.id], height: 21, lineHeight: 21 }}>
                  {LAYER_VN[row.id]}
                </Text>
              ))}
            </View>
            <PyramidChart layers={data.layerTable} />
          </View>
        </View>

        {/* ⑥ Clinical notes */}
        {data.notes.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ghi chú chuyên viên</Text>
            {data.notes.map((n, i) => (
              <View key={i} style={s.noteBlock}>
                <Text style={s.noteLabel}>{n.blockLabel}</Text>
                <Text style={s.noteText}>{n.note}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>SPEDUMAP · spedumax.com</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ═══ TRANG 3 — Kế hoạch ═══ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image src={logoPath} style={{ width: 28, height: 28 }} />
            <Text style={s.headerText}>SPEDUMAP</Text>
          </View>
          <Text style={s.headerSub}>Kế hoạch can thiệp</Text>
        </View>

        {/* ⑦ Recommendations + solutions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Phần cần can thiệp</Text>
          {data.recommendations.map((rec, i) => (
            <View key={i} style={s.recItem}>
              <View style={[s.recDot, { backgroundColor: LAYER_COLORS[`L${i % 8}`] ?? INK2 }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{rec.blockLabel}</Text>
                {rec.solutionTitle && (
                  <Text style={{ fontSize: 8, color: INK2, marginTop: 1 }}>Bài tập: {rec.solutionTitle}</Text>
                )}
              </View>
            </View>
          ))}
          {data.recommendations.length === 0 && (
            <Text style={{ fontSize: 8, color: INK3, fontStyle: 'italic' }}>Chưa có phần can thiệp ưu tiên.</Text>
          )}
        </View>

        {/* ⑧ Milestone projections */}
        {data.milestones.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Cột mốc phát triển dự kiến</Text>
            <Text style={{ fontSize: 7, color: INK3, marginBottom: 6 }}>
              Dựa trên điểm target — kết quả thực tế có thể khác biệt.
            </Text>
            {data.milestones.map((ms, i) => (
              <View key={i} style={s.msItem}>
                <Text style={s.msStage}>
                  {ms.skillFamily.replace(/_/g, ' ')} — dự kiến giai đoạn {ms.stage}
                </Text>
                <Text style={s.msDesc}>{ms.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View style={[s.section, { marginTop: 'auto' as unknown as number, paddingTop: 10 }]}>
          <Text style={{ fontSize: 7, color: INK3, textAlign: 'center' as const }}>
            Báo cáo này chỉ mang tính tham khảo. Mọi quyết định can thiệp cần được thảo luận với chuyên viên.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>SPEDUMAP · spedumax.com</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
