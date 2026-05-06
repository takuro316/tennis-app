import { memo, useMemo } from 'react'
import { toPolygonPoints } from '../utils/territory'
import type { BoundaryLine, TerritoryResult, TerritoryShape } from '../utils/territory'

type TerritoryLayerProps = {
  territoryData: TerritoryResult
  isLightMode: boolean
  showLabels: boolean
}

const TerritoryPolygon = memo(function TerritoryPolygon({
  shape,
}: {
  shape: TerritoryShape
}) {
  const points = useMemo(() => toPolygonPoints(shape.points), [shape.points])

  return (
    <polygon
      className={`territory-polygon ${shape.id}`}
      points={points}
      fill={shape.color}
      opacity={shape.opacity}
    />
  )
})

const BoundaryPolyline = memo(function BoundaryPolyline({
  line,
}: {
  line: BoundaryLine
}) {
  const points = useMemo(() => toPolygonPoints(line.points), [line.points])

  return (
    <polyline
      className={`territory-boundary ${line.id}`}
      points={points}
    />
  )
})

export const TerritoryLayer = memo(function TerritoryLayer({
  territoryData,
  isLightMode,
  showLabels,
}: TerritoryLayerProps) {
  return (
    <g className={`territory-layer ${isLightMode ? 'is-light' : ''}`}>
      <TerritoryPolygon shape={territoryData.shapes.returnable} />
      <TerritoryPolygon shape={territoryData.shapes.frontTerritory} />
      <TerritoryPolygon shape={territoryData.shapes.backTerritory} />

      {territoryData.boundaryLines.map((line) => (
        <BoundaryPolyline key={line.id} line={line} />
      ))}

      {showLabels &&
        territoryData.labels.map((label) => (
          <text
            key={label.id}
            className={`territory-label ${label.id}`}
            x={label.position.x}
            y={label.position.y}
          >
            {label.text}
          </text>
        ))}

      <circle
        className="hitter-origin"
        cx={territoryData.hitter.x}
        cy={territoryData.hitter.y}
        r="7"
      />
    </g>
  )
})
