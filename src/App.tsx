import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { TerritoryLayer } from './components/TerritoryLayer'
import type { Court, FrontSide, Point } from './utils/territory'
import './App.css'

type PlayerId = 'A' | 'B' | 'C' | 'D'
type HitterId = 'C' | 'D'

type Player = Point & {
  id: PlayerId
  role: string
  color: string
}

const court: Court = {
  x: 120,
  y: 60,
  width: 520,
  height: 980,
  serviceY: 345,
  centerY: 550,
  baselineY: 955,
}

const halfCourtHeight = court.height / 2
const serviceLineOffsetFromNet = halfCourtHeight * (21 / 39)
const upperServiceLineY = court.centerY - serviceLineOffsetFromNet
const lowerServiceLineY = court.centerY + serviceLineOffsetFromNet

const initialPlayers: Record<PlayerId, Player> = {
  A: {
    id: 'A',
    role: '自ペア 後衛',
    x: 260,
    y: 855,
    color: '#2563eb',
  },
  B: {
    id: 'B',
    role: '自ペア 前衛',
    x: 420,
    y: 635,
    color: '#facc15',
  },
  C: {
    id: 'C',
    role: '相手 前衛',
    x: 360,
    y: 455,
    color: '#f97316',
  },
  D: {
    id: 'D',
    role: '相手 後衛',
    x: 500,
    y: 125,
    color: '#ef4444',
  },
}

const playerOrder: PlayerId[] = ['A', 'B', 'C', 'D']

const legendItems = [
  {
    name: '返球可能範囲',
    color: '#fb923c',
    description: '選択中の打球者Hからこちらのコートへ返球される範囲',
  },
  {
    name: '前衛Bのテリトリー',
    color: '#facc15',
    description: '返球可能範囲を左右2分したB担当側',
  },
  {
    name: '後衛Aのテリトリー',
    color: '#3b82f6',
    description: '返球可能範囲を左右2分したA担当側',
  },
  {
    name: '分担ライン',
    color: '#e11d48',
    description: '黄色と青色を分ける返球可能範囲の中央線',
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getSvgPoint(svg: SVGSVGElement, event: PointerEvent<SVGElement>): Point {
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY

  const matrix = svg.getScreenCTM()
  if (!matrix) {
    return { x: 0, y: 0 }
  }

  const transformed = point.matrixTransform(matrix.inverse())
  return { x: transformed.x, y: transformed.y }
}

function App() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [players, setPlayers] =
    useState<Record<PlayerId, Player>>(initialPlayers)
  const [draggingId, setDraggingId] = useState<PlayerId | null>(null)
  const [frontSide, setFrontSide] = useState<FrontSide>('right')
  const [hitterId, setHitterId] = useState<HitterId>('D')

  function handlePlayerPointerDown(
    event: PointerEvent<SVGGElement>,
    id: PlayerId,
  ) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingId(id)
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!draggingId || !svgRef.current) {
      return
    }

    const position = getSvgPoint(svgRef.current, event)
    setPlayers((current) => ({
      ...current,
      [draggingId]: {
        ...current[draggingId],
        x: clamp(position.x, 24, 736),
        y: clamp(position.y, 24, 1126),
      },
    }))
  }

  function stopDragging() {
    setDraggingId(null)
  }

  function resetPlayers() {
    setPlayers(initialPlayers)
    setDraggingId(null)
    setHitterId('D')
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Soft Tennis Doubles Territory</p>
          <h1>ソフトテニス ダブルス・テリトリー可視化</h1>
        </div>
        <button className="reset-button" type="button" onClick={resetPlayers}>
          初期配置に戻す
        </button>
      </header>

      <section className="workspace" aria-label="テリトリー可視化エリア">
        <div className="court-panel">
          <svg
            ref={svgRef}
            className="court-svg"
            viewBox="0 0 760 1150"
            role="img"
            aria-label="上から見たテニスコートと選手位置"
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerLeave={stopDragging}
          >
            <defs>
              <pattern
                id="court-grain"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2d8a63" />
              </pattern>
            </defs>

            <rect className="canvas-bg" width="760" height="1150" rx="18" />
            <rect
              className="court-fill"
              x={court.x}
              y={court.y}
              width={court.width}
              height={court.height}
            />
            <rect
              className="court-grain"
              x={court.x}
              y={court.y}
              width={court.width}
              height={court.height}
              fill="url(#court-grain)"
            />

            <g className="court-lines">
              <rect
                x={court.x}
                y={court.y}
                width={court.width}
                height={court.height}
              />
              <line
                x1={court.x}
                y1={court.centerY}
                x2={court.x + court.width}
                y2={court.centerY}
              />
              <line
                x1={court.x}
                y1={upperServiceLineY}
                x2={court.x + court.width}
                y2={upperServiceLineY}
              />
              <line
                x1={court.x}
                y1={lowerServiceLineY}
                x2={court.x + court.width}
                y2={lowerServiceLineY}
              />
              <line
                x1={court.x + court.width / 2}
                y1={upperServiceLineY}
                x2={court.x + court.width / 2}
                y2={court.centerY}
              />
              <line
                x1={court.x + court.width / 2}
                y1={court.centerY}
                x2={court.x + court.width / 2}
                y2={lowerServiceLineY}
              />
              <line
                x1={court.x + 65}
                y1={court.y}
                x2={court.x + 65}
                y2={court.y + court.height}
              />
              <line
                x1={court.x + court.width - 65}
                y1={court.y}
                x2={court.x + court.width - 65}
                y2={court.y + court.height}
              />
            </g>

            <g className="net">
              <line
                x1={court.x - 18}
                y1={court.centerY}
                x2={court.x + court.width + 18}
                y2={court.centerY}
              />
              <text x={court.x + court.width + 34} y={court.centerY + 7}>
                NET
              </text>
            </g>

            <TerritoryLayer
              court={court}
              players={players}
              frontSide={frontSide}
              hitterId={hitterId}
            />

            {playerOrder.map((id) => {
              const player = players[id]
              const isDragging = draggingId === id
              const isHitter = hitterId === id

              return (
                <g
                  key={player.id}
                  className={`player ${isDragging ? 'is-dragging' : ''}`}
                  transform={`translate(${player.x} ${player.y})`}
                  onPointerDown={(event) =>
                    handlePlayerPointerDown(event, player.id)
                  }
                >
                  <circle r="25" fill={player.color} />
                  <circle
                    r={isHitter ? 36 : 31}
                    className={isHitter ? 'player-ring hitter-ring' : 'player-ring'}
                  />
                  <text className="player-id" y="7">
                    {player.id}
                  </text>
                  <text className="player-role" y="49">
                    {player.role}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <aside className="side-panel" aria-label="凡例と操作">
          <div className="hitter-card">
            <span className="hitter-dot">{hitterId}</span>
            <div>
              <h2>現在の打球者</h2>
              <p>
                打球者をC/Dから選択できます。A/Bの位置はテリトリー形状には影響しません。
              </p>
            </div>
          </div>

          <div className="legend">
            {legendItems.map((item) => (
              <div className="legend-row" key={item.name}>
                <span
                  className="legend-swatch"
                  style={{ backgroundColor: item.color }}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                </span>
              </div>
            ))}
          </div>

          <div className="side-control">
            <h2>打球者</h2>
            <div className="segmented-control" role="group" aria-label="打球者">
              <button
                type="button"
                className={hitterId === 'C' ? 'is-active' : ''}
                onClick={() => setHitterId('C')}
              >
                C：相手前衛
              </button>
              <button
                type="button"
                className={hitterId === 'D' ? 'is-active' : ''}
                onClick={() => setHitterId('D')}
              >
                D：相手後衛
              </button>
            </div>
          </div>

          <div className="side-control">
            <h2>前衛Bの担当サイド</h2>
            <div
              className="segmented-control"
              role="group"
              aria-label="前衛Bの担当サイド"
            >
              <button
                type="button"
                className={frontSide === 'right' ? 'is-active' : ''}
                onClick={() => setFrontSide('right')}
              >
                右側
              </button>
              <button
                type="button"
                className={frontSide === 'left' ? 'is-active' : ''}
                onClick={() => setFrontSide('left')}
              >
                左側
              </button>
            </div>
          </div>

          <div className="players-list">
            {playerOrder.map((id) => (
              <div className="player-row" key={id}>
                <span
                  className="player-dot"
                  style={{ backgroundColor: players[id].color }}
                >
                  {id}
                </span>
                <span>{players[id].role}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
