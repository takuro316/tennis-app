import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { TerritoryLayer } from './components/TerritoryLayer'
import { calculateTerritories } from './utils/territory'
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
    id: 'returnable',
    color: '#fb923c',
    description: '選択中の打球者Hからこちらのコートへ返球される範囲',
  },
  {
    name: '前衛Bのテリトリー',
    id: 'front-territory',
    color: '#facc15',
    description: '返球可能範囲を左右2分したB担当側',
  },
  {
    name: '後衛Aのテリトリー',
    id: 'back-territory',
    color: '#3b82f6',
    description: '返球可能範囲を左右2分したA担当側',
  },
  {
    name: '分担ライン',
    id: 'split-line',
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

function isHitterPlayer(id: PlayerId): id is HitterId {
  return id === 'C' || id === 'D'
}

function isLikelyIpad() {
  if (typeof window === 'undefined') {
    return false
  }

  const ua = window.navigator.userAgent
  const touchMac = ua.includes('Macintosh') && window.navigator.maxTouchPoints > 1

  return /iPad/.test(ua) || touchMac || window.innerWidth <= 1024
}

type CourtSurfaceProps = {
  isLightMode: boolean
}

const CourtSurface = memo(function CourtSurface({
  isLightMode,
}: CourtSurfaceProps) {
  const courtLines = useMemo(
    () => [
      {
        id: 'center',
        x1: court.x,
        y1: court.centerY,
        x2: court.x + court.width,
        y2: court.centerY,
      },
      {
        id: 'upper-service',
        x1: court.x,
        y1: upperServiceLineY,
        x2: court.x + court.width,
        y2: upperServiceLineY,
      },
      {
        id: 'lower-service',
        x1: court.x,
        y1: lowerServiceLineY,
        x2: court.x + court.width,
        y2: lowerServiceLineY,
      },
      {
        id: 'upper-center',
        x1: court.x + court.width / 2,
        y1: upperServiceLineY,
        x2: court.x + court.width / 2,
        y2: court.centerY,
      },
      {
        id: 'lower-center',
        x1: court.x + court.width / 2,
        y1: court.centerY,
        x2: court.x + court.width / 2,
        y2: lowerServiceLineY,
      },
      {
        id: 'left-alley',
        x1: court.x + 65,
        y1: court.y,
        x2: court.x + 65,
        y2: court.y + court.height,
      },
      {
        id: 'right-alley',
        x1: court.x + court.width - 65,
        y1: court.y,
        x2: court.x + court.width - 65,
        y2: court.y + court.height,
      },
    ],
    [],
  )

  return (
    <>
      {!isLightMode && (
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
      )}

      <rect className="canvas-bg" width="760" height="1150" rx="18" />
      <rect
        className="court-fill"
        x={court.x}
        y={court.y}
        width={court.width}
        height={court.height}
      />
      {!isLightMode && (
        <rect
          className="court-grain"
          x={court.x}
          y={court.y}
          width={court.width}
          height={court.height}
          fill="url(#court-grain)"
        />
      )}

      <g className="court-lines">
        <rect
          x={court.x}
          y={court.y}
          width={court.width}
          height={court.height}
        />
        {courtLines.map((line) => (
          <line key={line.id} {...line} />
        ))}
      </g>

      <g className="net">
        <line
          x1={court.x - 18}
          y1={court.centerY}
          x2={court.x + court.width + 18}
          y2={court.centerY}
        />
        {!isLightMode && (
          <text x={court.x + court.width + 34} y={court.centerY + 7}>
            NET
          </text>
        )}
      </g>
    </>
  )
})

type PlayerMarkerProps = {
  player: Player
  isDragging: boolean
  isHitter: boolean
  showLabels: boolean
  onPointerDown: (event: PointerEvent<SVGGElement>, id: PlayerId) => void
  onElement: (id: PlayerId, element: SVGGElement | null) => void
}

const PlayerMarker = memo(function PlayerMarker({
  player,
  isDragging,
  isHitter,
  showLabels,
  onPointerDown,
  onElement,
}: PlayerMarkerProps) {
  const handleElement = useCallback(
    (element: SVGGElement | null) => onElement(player.id, element),
    [onElement, player.id],
  )

  return (
    <g
      ref={handleElement}
      className={`player ${isDragging ? 'is-dragging' : ''}`}
      transform={`translate(${player.x} ${player.y})`}
      onPointerDown={(event) => onPointerDown(event, player.id)}
    >
      <circle r="25" fill={player.color} />
      <circle
        r={isHitter ? 36 : 31}
        className={isHitter ? 'player-ring hitter-ring' : 'player-ring'}
      />
      <text className="player-id" y="7">
        {player.id}
      </text>
      {showLabels && (
        <text className="player-role" y="49">
          {player.role}
        </text>
      )}
    </g>
  )
}, arePlayerMarkerPropsEqual)

function arePlayerMarkerPropsEqual(
  previous: PlayerMarkerProps,
  next: PlayerMarkerProps,
) {
  return (
    previous.player === next.player &&
    previous.isDragging === next.isDragging &&
    previous.isHitter === next.isHitter &&
    previous.showLabels === next.showLabels &&
    previous.onPointerDown === next.onPointerDown &&
    previous.onElement === next.onElement
  )
}

function App() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const playerElementRefs = useRef<Record<PlayerId, SVGGElement | null>>({
    A: null,
    B: null,
    C: null,
    D: null,
  })
  const draggingIdRef = useRef<PlayerId | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingPointRef = useRef<Point | null>(null)
  const dragCommitPointRef = useRef<Point | null>(null)
  const [players, setPlayers] =
    useState<Record<PlayerId, Player>>(initialPlayers)
  const [draggingId, setDraggingId] = useState<PlayerId | null>(null)
  const [frontSide, setFrontSide] = useState<FrontSide>('right')
  const [hitterId, setHitterId] = useState<HitterId>('D')
  const isIpadLike = useMemo(() => isLikelyIpad(), [])
  const [isLightMode, setIsLightMode] = useState(() => isIpadLike)
  const [showLabels, setShowLabels] = useState(false)
  const isDragging = draggingId !== null
  const isDraggingHitter = draggingId !== null && isHitterPlayer(draggingId)
  const effectiveShowLabels = showLabels && !isLightMode
  const territoryIsLightMode = isLightMode || isDraggingHitter
  const svgClassName = useMemo(
    () => {
      const classes = ['court-svg']

      if (isLightMode) {
        classes.push('is-light-mode')
      }

      if (isDragging) {
        classes.push('is-dragging')
      }

      return classes.join(' ')
    },
    [isDragging, isLightMode],
  )
  const territoryData = useMemo(
    () =>
      calculateTerritories({
        court,
        players: {
          A: initialPlayers.A,
          B: initialPlayers.B,
          C: players.C,
          D: players.D,
        },
        hitterId,
        frontSide,
      }),
    [
      frontSide,
      hitterId,
      players.C.x,
      players.C.y,
      players.D.x,
      players.D.y,
    ],
  )
  const visibleLegendItems = useMemo(() => legendItems, [])
  const playerList = useMemo(
    () => playerOrder.map((id) => initialPlayers[id]),
    [],
  )

  useEffect(() => {
    draggingIdRef.current = draggingId
  }, [draggingId])

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    },
    [],
  )

  const setPlayerElement = useCallback((
    id: PlayerId,
    element: SVGGElement | null,
  ) => {
    playerElementRefs.current[id] = element
  }, [])

  const movePlayerElement = useCallback((id: PlayerId, position: Point) => {
    const element = playerElementRefs.current[id]

    if (element) {
      element.setAttribute('transform', `translate(${position.x} ${position.y})`)
    }
  }, [])

  const updatePlayerPosition = useCallback((position: Point) => {
    const id = draggingIdRef.current

    if (!id) {
      return
    }

    const nextPosition = {
      x: clamp(position.x, 24, 736),
      y: clamp(position.y, 24, 1126),
    }

    if (!isHitterPlayer(id)) {
      dragCommitPointRef.current = nextPosition
      movePlayerElement(id, nextPosition)
      return
    }

    setPlayers((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...nextPosition,
      },
    }))
  }, [movePlayerElement])

  const handlePlayerPointerDown = useCallback((
    event: PointerEvent<SVGGElement>,
    id: PlayerId,
  ) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingIdRef.current = id
    dragCommitPointRef.current = null
    setDraggingId(id)
  }, [])

  const handlePointerMove = useCallback((
    event: PointerEvent<SVGSVGElement>,
  ) => {
    if (!draggingIdRef.current || !svgRef.current) {
      return
    }

    event.preventDefault()
    pendingPointRef.current = getSvgPoint(svgRef.current, event)

    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        if (pendingPointRef.current) {
          updatePlayerPosition(pendingPointRef.current)
          pendingPointRef.current = null
        }

        frameRef.current = null
      })
    }
  }, [updatePlayerPosition])

  const stopDragging = useCallback(() => {
    const id = draggingIdRef.current

    if (!id) {
      return
    }

    if (pendingPointRef.current) {
      updatePlayerPosition(pendingPointRef.current)
      pendingPointRef.current = null
    }

    if (id && !isHitterPlayer(id) && dragCommitPointRef.current) {
      const nextPosition = dragCommitPointRef.current

      setPlayers((current) => ({
        ...current,
        [id]: {
          ...current[id],
          ...nextPosition,
        },
      }))
    }

    dragCommitPointRef.current = null
    draggingIdRef.current = null
    setDraggingId(null)
  }, [updatePlayerPosition])

  const resetPlayers = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    pendingPointRef.current = null
    dragCommitPointRef.current = null
    draggingIdRef.current = null
    setPlayers(initialPlayers)
    setDraggingId(null)
    setHitterId('D')
  }, [])

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
            className={svgClassName}
            viewBox="0 0 760 1150"
            role="img"
            aria-label="上から見たテニスコートと選手位置"
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onPointerLeave={stopDragging}
          >
            <CourtSurface isLightMode={isLightMode} />

            <TerritoryLayer
              territoryData={territoryData}
              isLightMode={territoryIsLightMode}
              showLabels={effectiveShowLabels}
            />

            {playerOrder.map((id) => {
              const player = players[id]
              const isHitter = hitterId === id

              return (
                <PlayerMarker
                  key={player.id}
                  player={player}
                  isDragging={draggingId === id}
                  isHitter={isHitter}
                  showLabels={effectiveShowLabels}
                  onPointerDown={handlePlayerPointerDown}
                  onElement={setPlayerElement}
                />
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

          <div className="side-control">
            <h2>描画設定</h2>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={isLightMode}
                onChange={(event) =>
                  setIsLightMode(isIpadLike || event.currentTarget.checked)
                }
                disabled={isIpadLike}
              />
              <span>軽量モード</span>
            </label>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(event) => setShowLabels(event.currentTarget.checked)}
                disabled={isLightMode}
              />
              <span>ラベル表示</span>
            </label>
          </div>

          <div className="legend">
            {visibleLegendItems.map((item) => (
              <div className="legend-row" key={item.name}>
                <span
                  className={`legend-swatch ${item.id}`}
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
            {playerList.map((player) => (
              <div className="player-row" key={player.id}>
                <span
                  className={`player-dot player-dot-${player.id.toLowerCase()}`}
                >
                  {player.id}
                </span>
                <span>{player.role}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
