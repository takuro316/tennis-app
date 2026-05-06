export type Point = {
  x: number
  y: number
}

export type Court = {
  x: number
  y: number
  width: number
  height: number
  serviceY: number
  centerY: number
  baselineY: number
}

export type FrontSide = 'right' | 'left'
export type HitterId = 'C' | 'D'
export type PlayerInput = Point

export type TerritoryInput = {
  court: Court
  players: {
    A: PlayerInput
    B: PlayerInput
    C: PlayerInput
    D: PlayerInput
  }
  hitterId?: HitterId
  frontSide: FrontSide
}

export type TerritoryShape = {
  id: 'returnable' | 'frontTerritory' | 'backTerritory'
  label: string
  points: Point[]
  color: string
  opacity: number
}

export type BoundaryLine = {
  id: string
  label: string
  points: Point[]
}

export type TerritoryLabel = {
  id: string
  text: string
  position: Point
}

type AngleTerritory = {
  leftAngle: number
  centerAngle: number
  rightAngle: number
  leftFarPoint: Point
  centerFarPoint: Point
  rightFarPoint: Point
  leftCenterFarPoint: Point
  rightCenterFarPoint: Point
}

export type TwoTerritories = {
  frontTerritoryPolygon: Point[]
  backTerritoryPolygon: Point[]
}

export type TerritoryResult = TwoTerritories & {
  hitter: Point
  returnablePolygon: Point[]
  boundaryLines: BoundaryLine[]
  labels: TerritoryLabel[]
  shapes: {
    returnable: TerritoryShape
    frontTerritory: TerritoryShape
    backTerritory: TerritoryShape
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalize(value: number, min: number, max: number) {
  if (max === min) {
    return 0
  }

  return clamp((value - min) / (max - min), 0, 1)
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function lerpAngle(start: number, end: number, amount: number) {
  const diff = Math.atan2(Math.sin(end - start), Math.cos(end - start))

  return start + diff * amount
}

function pointBetween(start: Point, end: Point, amount: number): Point {
  return {
    x: lerp(start.x, end.x, amount),
    y: lerp(start.y, end.y, amount),
  }
}

function polygonCenter(points: Point[]) {
  const total = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  )

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  }
}

export function getAngle(from: Point, to: Point) {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

export function normalizeAngle(angle: number) {
  const fullTurn = Math.PI * 2
  return ((angle % fullTurn) + fullTurn) % fullTurn
}

function midpointAngle(startAngle: number, endAngle: number) {
  return startAngle + (endAngle - startAngle) / 2
}

function signedAngleDelta(fromAngle: number, toAngle: number) {
  return Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle))
}

function pointFromAngle(origin: Point, angle: number, distance: number) {
  return {
    x: origin.x + Math.cos(angle) * distance,
    y: origin.y + Math.sin(angle) * distance,
  }
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

function getForwardAmount(hitter: Point, court: Court) {
  const halfCourtHeight = court.height / 2
  const distanceFromNet = Math.abs(hitter.y - court.centerY)
  const t = 1 - normalize(distanceFromNet, 0, halfCourtHeight)

  return smoothstep(t)
}

function getSideAmount(hitter: Point, court: Court) {
  const courtCenterX = court.x + court.width / 2
  const halfCourtWidth = court.width / 2
  const sideNorm = clamp((hitter.x - courtCenterX) / halfCourtWidth, -1, 1)

  return smoothstep(Math.abs(sideNorm))
}

function getSideWeightedAngles({
  hitter,
  court,
  forwardAmount,
}: {
  hitter: Point
  court: Court
  forwardAmount: number
}) {
  const courtCenterX = court.x + court.width / 2
  const halfCourtWidth = court.width / 2
  const crossExpandX = court.width
  const ownBaselineY = court.y + court.height
  const ownServiceLineY = court.centerY + (court.height / 2) * (21 / 39)
  const straightAnchorY = lerp(ownServiceLineY, ownBaselineY, 0.03)
  const sideNorm = clamp((hitter.x - courtCenterX) / halfCourtWidth, -1, 1)
  const leftSideWeight = smoothstep(clamp(-sideNorm, 0, 1))
  const rightSideWeight = smoothstep(clamp(sideNorm, 0, 1))
  const shapeStrength = 0.35 + 0.65 * forwardAmount
  const symLeftAngle = getAngle(hitter, {
    x: court.x,
    y: ownBaselineY,
  })
  const symRightAngle = getAngle(hitter, {
    x: court.x + court.width,
    y: ownBaselineY,
  })
  const leftStraightAngle = getAngle(hitter, {
    x: court.x,
    y: straightAnchorY,
  })
  const rightStraightAngle = getAngle(hitter, {
    x: court.x + court.width,
    y: straightAnchorY,
  })
  const leftCrossAngle = getAngle(hitter, {
    x: court.x - crossExpandX,
    y: ownBaselineY,
  })
  const rightCrossAngle = getAngle(hitter, {
    x: court.x + court.width + crossExpandX,
    y: ownBaselineY,
  })
  let leftTargetAngle = symLeftAngle
  leftTargetAngle = lerpAngle(
    leftTargetAngle,
    leftStraightAngle,
    leftSideWeight,
  )
  leftTargetAngle = lerpAngle(leftTargetAngle, leftCrossAngle, rightSideWeight)

  let rightTargetAngle = symRightAngle
  rightTargetAngle = lerpAngle(
    rightTargetAngle,
    rightStraightAngle,
    rightSideWeight,
  )
  rightTargetAngle = lerpAngle(
    rightTargetAngle,
    rightCrossAngle,
    leftSideWeight,
  )

  const leftAngle = lerpAngle(symLeftAngle, leftTargetAngle, shapeStrength)
  const rightAngle = lerpAngle(symRightAngle, rightTargetAngle, shapeStrength)

  return { leftAngle, rightAngle }
}

function getAngleTerritory(hitter: Point, court: Court): AngleTerritory {
  const forwardAmount = getForwardAmount(hitter, court)
  const sideAmount = getSideAmount(hitter, court)
  const rayLength = court.height * 1.4
  const { leftAngle, rightAngle } = getSideWeightedAngles({
    hitter,
    court,
    forwardAmount,
  })
  const baseSplitAngle = midpointAngle(leftAngle, rightAngle)
  const middleExpandStrength = (1 - sideAmount) * forwardAmount
  const middleSpreadBoost = 1 + 0.3 * middleExpandStrength
  const expandedLeftAngle =
    baseSplitAngle +
    signedAngleDelta(baseSplitAngle, leftAngle) * middleSpreadBoost
  const expandedRightAngle =
    baseSplitAngle +
    signedAngleDelta(baseSplitAngle, rightAngle) * middleSpreadBoost
  const splitAngle = midpointAngle(expandedLeftAngle, expandedRightAngle)
  const leftCenterAngle = midpointAngle(expandedLeftAngle, splitAngle)
  const rightCenterAngle = midpointAngle(splitAngle, expandedRightAngle)

  return {
    leftAngle: expandedLeftAngle,
    centerAngle: splitAngle,
    rightAngle: expandedRightAngle,
    leftFarPoint: pointFromAngle(hitter, expandedLeftAngle, rayLength),
    centerFarPoint: pointFromAngle(hitter, splitAngle, rayLength),
    rightFarPoint: pointFromAngle(hitter, expandedRightAngle, rayLength),
    leftCenterFarPoint: pointFromAngle(hitter, leftCenterAngle, rayLength),
    rightCenterFarPoint: pointFromAngle(hitter, rightCenterAngle, rayLength),
  }
}

export function createTwoTerritories({
  hitter,
  territory,
  frontSide,
}: {
  hitter: Point
  territory: AngleTerritory
  frontSide: FrontSide
}): TwoTerritories {
  const leftPolygon = [hitter, territory.leftFarPoint, territory.centerFarPoint]
  const rightPolygon = [hitter, territory.centerFarPoint, territory.rightFarPoint]

  return {
    frontTerritoryPolygon: frontSide === 'left' ? leftPolygon : rightPolygon,
    backTerritoryPolygon: frontSide === 'left' ? rightPolygon : leftPolygon,
  }
}

function shape(
  id: TerritoryShape['id'],
  label: string,
  points: Point[],
  color: string,
  opacity: number,
): TerritoryShape {
  return { id, label, points, color, opacity }
}

export function calculateTerritories({
  court,
  players,
  hitterId = 'D',
  frontSide,
}: TerritoryInput): TerritoryResult {
  const hitter = hitterId === 'C' ? players.C : players.D
  const territory = getAngleTerritory(hitter, court)
  const { frontTerritoryPolygon, backTerritoryPolygon } = createTwoTerritories({
    hitter,
    territory,
    frontSide,
  })
  const frontCenterFarPoint =
    frontSide === 'left'
      ? territory.leftCenterFarPoint
      : territory.rightCenterFarPoint
  const backCenterFarPoint =
    frontSide === 'left'
      ? territory.rightCenterFarPoint
      : territory.leftCenterFarPoint
  const frontLabel = polygonCenter(frontTerritoryPolygon)
  const backLabel = polygonCenter(backTerritoryPolygon)

  return {
    hitter,
    returnablePolygon: [hitter, territory.leftFarPoint, territory.rightFarPoint],
    frontTerritoryPolygon,
    backTerritoryPolygon,
    boundaryLines: [
      {
        id: 'return-left',
        label: '返球可能範囲',
        points: [hitter, territory.leftFarPoint],
      },
      {
        id: 'split',
        label: '分担ライン',
        points: [hitter, territory.centerFarPoint],
      },
      {
        id: 'front-center',
        label: 'B中心線',
        points: [hitter, frontCenterFarPoint],
      },
      {
        id: 'back-center',
        label: 'A中心線',
        points: [hitter, backCenterFarPoint],
      },
      {
        id: 'return-right',
        label: '返球可能範囲',
        points: [hitter, territory.rightFarPoint],
      },
    ],
    labels: [
      {
        id: 'split',
        text: '分担ライン',
        position: pointBetween(hitter, territory.centerFarPoint, 0.58),
      },
      {
        id: 'front-center',
        text: 'B中心線',
        position: pointBetween(hitter, frontCenterFarPoint, 0.62),
      },
      {
        id: 'back-center',
        text: 'A中心線',
        position: pointBetween(hitter, backCenterFarPoint, 0.66),
      },
      {
        id: 'returnable',
        text: '返球可能範囲',
        position: pointBetween(hitter, territory.centerFarPoint, 0.78),
      },
      {
        id: 'b',
        text: '前衛Bのテリトリー',
        position: frontLabel,
      },
      {
        id: 'a',
        text: '後衛Aのテリトリー',
        position: backLabel,
      },
    ],
    shapes: {
      returnable: shape(
        'returnable',
        '返球可能範囲',
        [hitter, territory.leftFarPoint, territory.rightFarPoint],
        '#fb923c',
        0.18,
      ),
      frontTerritory: shape(
        'frontTerritory',
        '前衛Bのテリトリー',
        frontTerritoryPolygon,
        '#facc15',
        0.64,
      ),
      backTerritory: shape(
        'backTerritory',
        '後衛Aのテリトリー',
        backTerritoryPolygon,
        '#3b82f6',
        0.58,
      ),
    },
  }
}

export function toPolygonPoints(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}
