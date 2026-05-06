import { calculateTerritories, toPolygonPoints } from '../utils/territory'
import type { Court, PlayerInput, TerritoryShape } from '../utils/territory'

type TerritoryLayerProps = {
  court: Court
  players: {
    A: PlayerInput
    B: PlayerInput
    C: PlayerInput
    D: PlayerInput
  }
  frontSide: 'right' | 'left'
  hitterId: 'C' | 'D'
}

function TerritoryPolygon({ shape }: { shape: TerritoryShape }) {
  return (
    <polygon
      className={`territory-polygon ${shape.id}`}
      points={toPolygonPoints(shape.points)}
      fill={shape.color}
      opacity={shape.opacity}
    />
  )
}

export function TerritoryLayer({
  court,
  players,
  frontSide,
  hitterId,
}: TerritoryLayerProps) {
  const territories = calculateTerritories({
    court,
    players,
    hitterId,
    frontSide,
  })

  return (
    <g className="territory-layer">
      <TerritoryPolygon shape={territories.shapes.returnable} />
      <TerritoryPolygon shape={territories.shapes.frontTerritory} />
      <TerritoryPolygon shape={territories.shapes.backTerritory} />

      {territories.boundaryLines.map((line) => (
        <polyline
          key={line.id}
          className={`territory-boundary ${line.id}`}
          points={toPolygonPoints(line.points)}
        />
      ))}

      {territories.labels.map((label) => (
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
        cx={territories.hitter.x}
        cy={territories.hitter.y}
        r="7"
      />
    </g>
  )
}
