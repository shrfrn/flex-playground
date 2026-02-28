import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
	Settings, Play, Code, Plus, Minus,
	Copy, Check, Award, PartyPopper, Eye, EyeOff, Layout as LayoutIcon,
	ChevronLeft, ChevronRight, Pause, PlayCircle, SkipForward,
	SlidersHorizontal, FileCode, Box, GraduationCap, Gamepad2,
	ArrowRight, ArrowDown, Axis3d, GripVertical, Info,
	ArrowLeftToLine, RotateCcw,
} from 'lucide-react'

const DEFAULT_CONTAINER_STYLES = {
	display: 'flex',
	flexDirection: 'row',
	justifyContent: 'start',
	alignItems: 'stretch',
	flexWrap: 'nowrap',
	gap: '10px',
}

const DEFAULT_ITEMS = [
	{ id: 1, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '60px', height: '60px' },
	{ id: 2, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '80px', height: '50px' },
	{ id: 3, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '50px', height: '80px' },
	{ id: 4, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '70px', height: '40px' },
	{ id: 5, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '90px', height: '70px' },
]

const SIZE_RATIOS = [
	{ w: 0.75, h: 0.85 },
	{ w: 1.0, h: 0.70 },
	{ w: 0.65, h: 1.10 },
	{ w: 0.85, h: 0.55 },
	{ w: 1.10, h: 0.95 },
]
const TARGET_FILL = 0.85
const MIN_CONSTRAINT = 120

function computeDefaultItems(containerWidth, containerHeight, count = 5) {
	const padding = 60
	const gapSize = 10
	const totalGap = (count - 1) * gapSize
	const availableW = containerWidth - padding - totalGap
	const totalWRatio = SIZE_RATIOS.slice(0, count).reduce((s, r) => s + r.w, 0)
	const baseW = (availableW * TARGET_FILL) / totalWRatio
	const baseH = baseW * 0.45

	return SIZE_RATIOS.slice(0, count).map((ratio, i) => ({
		id: i + 1,
		alignSelf: 'auto',
		flexGrow: 0,
		flexShrink: 1,
		order: 0,
		width: `${Math.round(baseW * ratio.w)}px`,
		height: `${Math.round(baseH * ratio.h)}px`,
	}))
}

function generateContainerCssFromDefaults() {
	const c = DEFAULT_CONTAINER_STYLES
	let css = `.container {\n  display: ${c.display};\n`
	if (c.display === 'flex') {
		css += `  flex-direction: ${c.flexDirection};\n`
		css += `  justify-content: ${c.justifyContent};\n`
		css += `  align-items: ${c.alignItems};\n`
		css += `  flex-wrap: ${c.flexWrap};\n`
		css += `  gap: ${c.gap};\n`
	}
	css += `}\n`
	return css.trim()
}

function generateItemCssFromDefaults(itemIndex, itemsSource = DEFAULT_ITEMS) {
	const item = itemsSource[itemIndex - 1]
	if (!item) return ''
	return `.item-${itemIndex} {\n  width: ${item.width};\n  height: ${item.height};\n  align-self: ${item.alignSelf};\n  flex-grow: ${item.flexGrow};\n  flex-shrink: ${item.flexShrink};\n  order: ${item.order};\n}\n`
}

const App = () => {
	// --- State Definitions ---
	const [activeTab, setActiveTab] = useState('properties') // 'properties' | 'code' | 'items'
	const [itemCount, setItemCount] = useState(3)
	const [selectedId, setSelectedId] = useState(1)
	const [isQuizMode, setIsQuizMode] = useState(false)
	const [showHint, setShowHint] = useState(false)
	const [score, setScore] = useState(0)
	const scoredQuestionsRef = useRef(new Set())
	const [itemOpacity, setItemOpacity] = useState(1)
	const [outlineOnly, setOutlineOnly] = useState(false) // Toggle: transparent bg + thin outline, no text
	const [quizDifficulty, setQuizDifficulty] = useState('medium') // 'easy' | 'medium' | 'hard' | 'custom'
	const [showAxes, setShowAxes] = useState(true) // Toggle for axis visibility
	const [showQuizOptions, setShowQuizOptions] = useState(false)
	const [quizIncludeItemProps, setQuizIncludeItemProps] = useState(true)
	const [quizIncludeOrder, setQuizIncludeOrder] = useState(true)
	const [quizIncludeShrinkGrow, setQuizIncludeShrinkGrow] = useState(false)
	const [quizIncludeFlexWrap, setQuizIncludeFlexWrap] = useState(false)
	const [quizQuestionCount, setQuizQuestionCount] = useState(10)

	// Quiz History Management
	const [quizHistory, setQuizHistory] = useState([])
	const [historyIndex, setHistoryIndex] = useState(-1)
	const [isPaused, setIsPaused] = useState(false)
	const [countdown, setCountdown] = useState(0)
	const [showSuccess, setShowSuccess] = useState(false)
	const [quizCompleted, setQuizCompleted] = useState(false)
	const [hintCount, setHintCount] = useState(0)
	const [revealedHints, setRevealedHints] = useState([])
	const [showSolutionPrompt, setShowSolutionPrompt] = useState(false)
	const [showSolutionConfirm, setShowSolutionConfirm] = useState(false)
	const [showSolution, setShowSolution] = useState(false)

	const QUIZ_DELAY_MS = 3000

	const CONFETTI_COLORS = ['#10b981', '#ec4899', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#eab308']
	const confettiPieces = useMemo(() => {
		if (!quizCompleted) return []
		return Array.from({ length: 100 }, (_, i) => ({
			left: Math.random() * 100,
			top: -15 - Math.random() * 15,
			delay: Math.random() * 1.2,
			duration: 3 + Math.random() * 2.5,
			color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
			size: 6 + Math.floor(Math.random() * 6),
			drift: (Math.random() - 0.5) * 120,
			rotate: 360 + Math.random() * 360,
		}))
	}, [quizCompleted])

	// Container Styles
	const [containerStyles, setContainerStyles] = useState({ ...DEFAULT_CONTAINER_STYLES })
	const [containerMaxWidth, setContainerMaxWidth] = useState(null)
	const [containerMaxHeight, setContainerMaxHeight] = useState(null)

	// Individual Item Styles
	const [defaultItems, setDefaultItems] = useState(DEFAULT_ITEMS.map(item => ({ ...item })))
	const [items, setItems] = useState(DEFAULT_ITEMS.map((item) => ({ ...item })))

	const [cssCode, setCssCode] = useState('')
	const [itemCodes, setItemCodes] = useState(() => Array(5).fill(''))
	const [containerCodeDirty, setContainerCodeDirty] = useState(false)
	const [itemCodeDirty, setItemCodeDirty] = useState(() => Array(5).fill(false))
	const [codeResetKey, setCodeResetKey] = useState(0)

	const isContainerTainted = useMemo(() => {
		const d = DEFAULT_CONTAINER_STYLES
		const c = containerStyles
		const propsMatch = d.display === c.display && d.flexDirection === c.flexDirection && d.justifyContent === c.justifyContent && d.alignItems === c.alignItems && d.flexWrap === c.flexWrap && d.gap === c.gap
		return !propsMatch || containerCodeDirty || containerMaxWidth !== null || containerMaxHeight !== null
	}, [containerStyles, containerCodeDirty, containerMaxWidth, containerMaxHeight])

	const currentItemId = selectedId > 0 ? selectedId : 1
	const isCurrentItemTainted = useMemo(() => {
		const idx = currentItemId - 1
		if (idx < 0 || idx >= items.length) return false
		const def = defaultItems[idx]
		const cur = items[idx]
		if (!def || !cur) return false
		const propsMatch = def.alignSelf === cur.alignSelf && def.flexGrow === cur.flexGrow && def.flexShrink === cur.flexShrink && def.order === cur.order && def.width === cur.width && def.height === cur.height
		return !propsMatch || itemCodeDirty[idx]
	}, [items, currentItemId, itemCodeDirty, defaultItems])
	const [copyFeedback, setCopyFeedback] = useState(false)
	const realContainerRef = useRef(null)
	const ghostContainerRef = useRef(null)
	const mainAreaRef = useRef(null)
	const isQuizModeRef = useRef(false)
	const userWorkRef = useRef(null)
	const rightHandleDragRef = useRef(null)
	const bottomHandleDragRef = useRef(null)
	const cornerHandleDragRef = useRef(null)
	const lastUpdateFromCodeEditorRef = useRef(false)
	const lastUpdateFromItemCodeEditorRef = useRef(false)
	const [hintPopoverPosition, setHintPopoverPosition] = useState(null)
	const hintPopoverRef = useRef(null)
	const hintDragRef = useRef(null)

	const flexValues = {
		flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
		justifyContent: ['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly'],
		alignItems: ['stretch', 'start', 'end', 'center', 'baseline'],
		flexWrap: ['nowrap', 'wrap', 'wrap-reverse'],
		alignSelf: ['auto', 'start', 'end', 'center', 'baseline', 'stretch'],
	}

	const applyDifficultyPreset = preset => {
		setQuizDifficulty(preset)

		if (preset === 'custom') return

		if (preset === 'easy') {
			setQuizIncludeItemProps(false)
			setQuizIncludeOrder(false)
			setQuizIncludeShrinkGrow(false)
			setQuizIncludeFlexWrap(false)
			return
		}

		if (preset === 'medium') {
			setQuizIncludeItemProps(true)
			setQuizIncludeOrder(true)
			setQuizIncludeShrinkGrow(false)
			setQuizIncludeFlexWrap(false)
			return
		}

		if (preset === 'hard') {
			setQuizIncludeItemProps(true)
			setQuizIncludeOrder(true)
			setQuizIncludeShrinkGrow(true)
			setQuizIncludeFlexWrap(true)
		}
	}

	const generateContainerCss = () => {
		let css = `.container {\n  display: ${containerStyles.display};\n`
		if (containerStyles.display === 'flex') {
			css += `  flex-direction: ${containerStyles.flexDirection};\n`
			css += `  justify-content: ${containerStyles.justifyContent};\n`
			css += `  align-items: ${containerStyles.alignItems};\n`
			css += `  flex-wrap: ${containerStyles.flexWrap};\n`
			css += `  gap: ${containerStyles.gap};\n`
		}
		css += `}\n`
		return css.trim()
	}

	const generateItemCss = (itemIndex) => {
		const item = items[itemIndex - 1]
		if (!item) return ''
		return `.item-${itemIndex} {\n  width: ${item.width};\n  height: ${item.height};\n  align-self: ${item.alignSelf};\n  flex-grow: ${item.flexGrow};\n  flex-shrink: ${item.flexShrink};\n  order: ${item.order};\n}\n`
	}

	useEffect(() => {
		if (lastUpdateFromCodeEditorRef.current) {
			lastUpdateFromCodeEditorRef.current = false
		} else {
			setCssCode(generateContainerCss())
			setContainerCodeDirty(false)
		}
		if (lastUpdateFromItemCodeEditorRef.current) {
			lastUpdateFromItemCodeEditorRef.current = false
		} else {
			setItemCodes(items.slice(0, 5).map((_, idx) => generateItemCss(idx + 1)))
			setItemCodeDirty(() => Array(5).fill(false))
		}
	}, [containerStyles, items, itemCount])

	const [activeCodeTab, setActiveCodeTab] = useState('container')

	useEffect(() => {
		if (typeof activeCodeTab === 'number' && activeCodeTab > itemCount) setActiveCodeTab('container')
	}, [itemCount])

	const getDisplayedCode = () => {
		if (activeCodeTab === 'container') return cssCode
		const idx = activeCodeTab - 1
		return itemCodes[idx] !== undefined && itemCodes[idx] !== '' ? itemCodes[idx] : generateItemCss(activeCodeTab)
	}

	const resetContainerCode = () => {
		setContainerStyles({ ...DEFAULT_CONTAINER_STYLES })
		setCssCode(generateContainerCssFromDefaults())
		setContainerCodeDirty(false)
		setContainerMaxWidth(null)
		setContainerMaxHeight(null)
		setCodeResetKey(k => k + 1)
	}
	const resetItemCode = (itemIndex) => {
		setItems(prev => prev.map((it, i) => (i === itemIndex - 1 ? { ...defaultItems[itemIndex - 1] } : it)))
		setItemCodes(prev => {
			const next = [...prev]
			next[itemIndex - 1] = generateItemCssFromDefaults(itemIndex, defaultItems)
			return next
		})
		setItemCodeDirty(prev => {
			const next = [...prev]
			next[itemIndex - 1] = false
			return next
		})
		setCodeResetKey(k => k + 1)
	}

	const resetAllToDefaults = () => {
		resetContainerCode()
		setItems(defaultItems.map(item => ({ ...item })))
		setItemCodes(defaultItems.map((_, idx) => generateItemCssFromDefaults(idx + 1, defaultItems)))
		setItemCodeDirty(() => Array(5).fill(false))
		setCodeResetKey(k => k + 1)
	}

	const parseItemCss = (val, itemIndex) => {
		const idx = itemIndex - 1
		if (idx < 0 || idx >= items.length) return
		const newItems = [...items]
		const item = { ...newItems[idx] }
		const widthMatch = val.match(/width:\s*([^;\n]+)/)
		if (widthMatch) item.width = widthMatch[1].trim()
		const heightMatch = val.match(/height:\s*([^;\n]+)/)
		if (heightMatch) item.height = heightMatch[1].trim()
		const alignMatch = val.match(/align-self:\s*([\w-]+)/i)
		if (alignMatch) item.alignSelf = alignMatch[1].toLowerCase().replace(/^flex-/, '') || item.alignSelf
		const growMatch = val.match(/flex-grow:\s*(\d+)/)
		if (growMatch) item.flexGrow = parseInt(growMatch[1], 10)
		const shrinkMatch = val.match(/flex-shrink:\s*(\d+)/)
		if (shrinkMatch) item.flexShrink = parseInt(shrinkMatch[1], 10)
		const orderMatch = val.match(/order:\s*(-?\d+)/)
		if (orderMatch) item.order = parseInt(orderMatch[1], 10)
		newItems[idx] = item
		setItems(newItems)
	}

	const handleCssEdit = (e) => {
		const val = e.target.value
		lastUpdateFromCodeEditorRef.current = true
		setContainerCodeDirty(true)
		setCssCode(val)
		const newContainer = { ...containerStyles }
		const displayMatch = val.match(/display:\s*(block|flex)/i)
		if (displayMatch) newContainer.display = displayMatch[1].toLowerCase()
		const dirMatch = val.match(/flex-direction:\s*([\w-]+)/)
		if (dirMatch) newContainer.flexDirection = dirMatch[1].replace('flex-', '')
		const justifyMatch = val.match(/justify-content:\s*([\w-]+)/)
		if (justifyMatch) newContainer.justifyContent = justifyMatch[1].replace('flex-', '')
		const alignMatch = val.match(/align-items:\s*([\w-]+)/)
		if (alignMatch) newContainer.alignItems = alignMatch[1].replace('flex-', '')
		const wrapMatch = val.match(/flex-wrap:\s*([\w-]+)/)
		if (wrapMatch) newContainer.flexWrap = wrapMatch[1]
		const gapMatch = val.match(/gap:\s*(\d+px)/)
		if (gapMatch) newContainer.gap = gapMatch[1]
		setContainerStyles(newContainer)
	}

	const handleItemCssEdit = (e, itemIndex) => {
		const val = e.target.value
		lastUpdateFromItemCodeEditorRef.current = true
		setItemCodeDirty(prev => {
			const next = [...prev]
			next[itemIndex - 1] = true
			return next
		})
		setItemCodes(prev => {
			const next = [...prev]
			next[itemIndex - 1] = val
			return next
		})
		parseItemCss(val, itemIndex)
	}

	const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)]

	const generateQuizQuestion = () => {
		const containerProps = {
			flexDirection: pickRandom(flexValues.flexDirection),
			justifyContent: pickRandom(flexValues.justifyContent),
			alignItems: pickRandom(flexValues.alignItems),
			flexWrap: 'nowrap',
			gap: `${Math.floor(Math.random() * 5) * 5}px`,
		}

		if (quizIncludeFlexWrap && Math.random() > 0.4) {
			containerProps.flexWrap = pickRandom(['wrap', 'wrap-reverse'])

			const isColumn = containerProps.flexDirection.includes('column')
			const activeDefaults = defaultItems.slice(0, itemCount)
			const sizes = activeDefaults.map(it => parseInt(isColumn ? it.height : it.width))
			const gapPx = parseInt(containerProps.gap)
			const totalSize = sizes.reduce((a, b) => a + b, 0) + (itemCount - 1) * gapPx
			const constraintAxis = isColumn ? 'height' : 'width'
			const constraintValue = Math.round(totalSize * (0.5 + Math.random() * 0.2)) + 60
			containerProps.containerConstraint = { [constraintAxis]: constraintValue }
		}

		const hasItemLevelConfig = quizIncludeItemProps || quizIncludeOrder || quizIncludeShrinkGrow
		if (!hasItemLevelConfig && containerProps.flexWrap === 'nowrap') return containerProps

		const itemOverrides = {}
		const activeItems = items.slice(0, itemCount)

		activeItems.forEach(item => {
			const overrides = {}

			if (quizIncludeItemProps && Math.random() > 0.5) {
				const alignOptions = flexValues.alignSelf.filter(v => v !== 'auto')
				overrides.alignSelf = pickRandom(alignOptions)
			}

			if (quizIncludeShrinkGrow && Math.random() > 0.5) {
				const nextGrow = Math.floor(Math.random() * 4)
				const nextShrink = Math.floor(Math.random() * 4)

				if (nextGrow !== item.flexGrow) overrides.flexGrow = nextGrow
				if (nextShrink !== item.flexShrink) overrides.flexShrink = nextShrink
			}

			if (Object.keys(overrides).length > 0) itemOverrides[item.id] = overrides
		})

		if (quizIncludeOrder && Math.random() > 0.3) {
			const defaultVisual = getVisualOrder(activeItems, it => defaultItems.find(d => d.id === it.id)?.order ?? 0)
			const shuffled = [...defaultVisual].sort(() => Math.random() - 0.5)
			const isIdentical = shuffled.every((id, i) => id === defaultVisual[i])

			if (!isIdentical) {
				shuffled.forEach((id, visualIdx) => {
					if (!itemOverrides[id]) itemOverrides[id] = {}
					itemOverrides[id].order = visualIdx
				})
			}
		}

		if (Object.keys(itemOverrides).length === 0 && containerProps.flexWrap === 'nowrap') {
			const defaultVisual = getVisualOrder(activeItems, it => defaultItems.find(d => d.id === it.id)?.order ?? 0)
			const shuffled = [...defaultVisual].sort(() => Math.random() - 0.5)
			const isIdentical = shuffled.every((id, i) => id === defaultVisual[i])

			if (!isIdentical) {
				shuffled.forEach((id, visualIdx) => {
					if (!itemOverrides[id]) itemOverrides[id] = {}
					itemOverrides[id].order = visualIdx
				})
			} else {
				const first = activeItems[0]
				const last = activeItems[activeItems.length - 1]
				itemOverrides[first.id] = { order: activeItems.length }
				itemOverrides[last.id] = { order: -1 }
			}
		}

		return { ...containerProps, itemOverrides }
	}

	const startNewQuiz = (forceStart = false) => {
		if (!forceStart && quizHistory.length >= quizQuestionCount) return

		userWorkRef.current = null
		setContainerStyles({ ...DEFAULT_CONTAINER_STYLES })
		setItems(defaultItems.map(item => ({ ...item })))
		setContainerMaxWidth(null)
		setContainerMaxHeight(null)
		setQuizHistory((prev) => [...prev, generateQuizQuestion()])
		setHistoryIndex((prev) => prev + 1)
		setCountdown(0)
		setShowSuccess(false)
		setIsPaused(false)
		setQuizCompleted(false)
		setShowHint(false)
		setHintCount(0)
		setRevealedHints([])
		setShowSolutionPrompt(false)
		setShowSolutionConfirm(false)
		setShowSolution(false)
		setHintPopoverPosition(null)
	}

	const startQuizSession = () => {
		scoredQuestionsRef.current = new Set()
		setQuizHistory([])
		setHistoryIndex(-1)
		setScore(0)
		setShowHint(false)
		setOutlineOnly(false)
		setCountdown(0)
		setIsPaused(false)
		setQuizCompleted(false)
		setHintCount(0)
		setRevealedHints([])
		setShowSolutionPrompt(false)
		setShowSolutionConfirm(false)
		setShowSolution(false)
		setHintPopoverPosition(null)
		startNewQuiz(true)
	}

	const skipToNext = () => startNewQuiz()

	const saveUserWork = () => {
		userWorkRef.current = {
			containerStyles: { ...containerStyles },
			items: items.map(it => ({ ...it })),
			containerMaxWidth,
			containerMaxHeight,
		}
	}

	const applyTarget = (target) => {
		setContainerStyles({
			display: 'flex',
			flexDirection: target.flexDirection,
			justifyContent: target.justifyContent,
			alignItems: target.alignItems,
			flexWrap: target.flexWrap || 'nowrap',
			gap: target.gap,
		})
		setItems(prev => prev.map(it => {
			const def = defaultItems.find(d => d.id === it.id) || it
			const ov = target.itemOverrides?.[it.id] || {}
			return {
				...it,
				alignSelf: ov.alignSelf ?? def.alignSelf,
				flexGrow: ov.flexGrow ?? def.flexGrow,
				flexShrink: ov.flexShrink ?? def.flexShrink,
				order: ov.order ?? def.order,
			}
		}))
	}

	const restoreUserWork = () => {
		if (!userWorkRef.current) return
		setContainerStyles({ ...userWorkRef.current.containerStyles })
		setItems(userWorkRef.current.items.map(it => ({ ...it })))
		setContainerMaxWidth(userWorkRef.current.containerMaxWidth)
		setContainerMaxHeight(userWorkRef.current.containerMaxHeight)
	}

	const currentQuestionIndex = quizHistory.length - 1

	const goBack = () => {
		if (historyIndex <= 0) return
		if (historyIndex === currentQuestionIndex) saveUserWork()
		setHistoryIndex(historyIndex - 1)
		applyTarget(quizHistory[historyIndex - 1])
		setShowSuccess(false)
		setCountdown(0)
	}

	const goForward = () => {
		if (historyIndex >= quizHistory.length - 1) return
		const nextIndex = historyIndex + 1

		if (nextIndex === currentQuestionIndex) {
			restoreUserWork()
		} else {
			applyTarget(quizHistory[nextIndex])
		}

		setHistoryIndex(nextIndex)
		setShowSuccess(false)
		setCountdown(0)
	}

	const normalizeAlign = val => val === 'stretch' ? 'start' : val

	const resolveAlignSelf = (alignSelf, containerAlignItems) =>
		normalizeAlign(alignSelf === 'auto' ? containerAlignItems : alignSelf)

	const getVisualOrder = (activeItems, orderFn) =>
		activeItems
			.map((item, idx) => ({ id: item.id, order: orderFn(item), domIndex: idx }))
			.sort((a, b) => a.order - b.order || a.domIndex - b.domIndex)
			.map(x => x.id)

	const getActiveHintKeys = () => {
		if (!quizTarget) return new Set()

		const keys = new Set()

		if (containerStyles.flexDirection !== quizTarget.flexDirection) keys.add('direction')
		if (containerStyles.justifyContent !== quizTarget.justifyContent) keys.add('justify')
		if (normalizeAlign(containerStyles.alignItems) !== normalizeAlign(quizTarget.alignItems)) keys.add('align')
		if (containerStyles.flexWrap !== quizTarget.flexWrap) keys.add('wrap')

		const directionMatches = containerStyles.flexDirection === quizTarget.flexDirection
		const justifyMatches = containerStyles.justifyContent === quizTarget.justifyContent

		if (containerStyles.gap !== quizTarget.gap && directionMatches && justifyMatches) keys.add('gap')

		const activeItems = items.slice(0, itemCount)

		const userVisualOrder = getVisualOrder(activeItems, it => it.order)
		const targetVisualOrder = getVisualOrder(activeItems, it => {
			const defaultItem = defaultItems.find(d => d.id === it.id) || it
			return (quizTarget.itemOverrides?.[it.id]?.order) ?? defaultItem.order
		})
		const orderMatters = userVisualOrder.some((id, i) => id !== targetVisualOrder[i])

		activeItems.forEach(item => {
			const defaultItem = defaultItems.find(it => it.id === item.id) || item
			const ov = quizTarget.itemOverrides?.[item.id] || {}

			if (ov.alignSelf !== undefined) {
				const userResolved = resolveAlignSelf(item.alignSelf, containerStyles.alignItems)
				const targetResolved = resolveAlignSelf(ov.alignSelf, quizTarget.alignItems)
				if (userResolved !== targetResolved) keys.add(`alignSelf-${item.id}`)
			} else if (item.alignSelf !== defaultItem.alignSelf) {
				keys.add(`alignSelf-${item.id}`)
			}

			if (orderMatters) {
				if (ov.order !== undefined) {
					if (item.order !== ov.order) keys.add(`order-${item.id}`)
				} else if (item.order !== defaultItem.order) {
					keys.add(`order-${item.id}`)
				}
			} else if (item.order !== defaultItem.order) {
				keys.add(`order-${item.id}`)
			}

			if (ov.flexGrow !== undefined) {
				if (item.flexGrow !== ov.flexGrow) keys.add(`grow-${item.id}`)
			} else if (item.flexGrow !== defaultItem.flexGrow) {
				keys.add(`grow-${item.id}`)
			}

			if (ov.flexShrink !== undefined) {
				if (item.flexShrink !== ov.flexShrink) keys.add(`shrink-${item.id}`)
			} else if (item.flexShrink !== defaultItem.flexShrink) {
				keys.add(`shrink-${item.id}`)
			}
		})

		return keys
	}

	const buildHintText = key => {
		if (key === 'direction') return 'Consider changing the container\'s flex-direction property.'
		if (key === 'justify') return 'Consider adjusting the container\'s justify-content property.'
		if (key === 'align') return 'Consider changing the container\'s align-items property.'
		if (key === 'wrap') return 'Consider changing the container\'s flex-wrap property.'
		if (key === 'gap') return 'Consider adjusting the container\'s gap property.'

		const match = key.match(/^(\w+)-(\d+)$/)
		if (!match) return key
		const [, prop, id] = match

		if (prop === 'alignSelf') {
			const ov = quizTarget.itemOverrides?.[id]
			if (ov?.alignSelf !== undefined) return `Consider changing item #${id}'s align-self property.`
			return `Item #${id} doesn't need a custom align-self — consider resetting it.`
		}

		if (prop === 'order') {
			const ov = quizTarget.itemOverrides?.[id]
			if (ov?.order !== undefined) return `Consider changing the order of item #${id}.`
			return `Item #${id} doesn't need a custom order — consider resetting it.`
		}

		if (prop === 'grow') {
			const ov = quizTarget.itemOverrides?.[id]
			if (ov?.flexGrow !== undefined) return `Consider adjusting the flex-grow value of item #${id}.`
			return `Item #${id} doesn't need a custom flex-grow — consider resetting it.`
		}

		if (prop === 'shrink') {
			const ov = quizTarget.itemOverrides?.[id]
			if (ov?.flexShrink !== undefined) return `Consider adjusting the flex-shrink value of item #${id}.`
			return `Item #${id} doesn't need a custom flex-shrink — consider resetting it.`
		}

		return key
	}

	function revealNextHint() {
		if (!isQuizMode || !quizTarget || quizCompleted) return

		const activeKeys = getActiveHintKeys()
		const revealedKeys = revealedHints.map(h => h.key)
		const unrevealedKeys = [...activeKeys].filter(k => !revealedKeys.includes(k))

		if (unrevealedKeys.length === 0 || hintCount >= 3) {
			setShowSolutionPrompt(true)
			return
		}

		const nextKey = unrevealedKeys[0]
		setRevealedHints(prev => [...prev, { key: nextKey, text: buildHintText(nextKey) }])

		const newCount = hintCount + 1
		setHintCount(newCount)

		if (newCount >= 3) setShowSolutionPrompt(true)
		else setShowSolutionPrompt(false)
	}

	const handleHintClick = () => {
		if (!isQuizMode || !quizTarget || quizCompleted) return

		const opening = !showHint
		setShowHint(prev => !prev)

		if (opening && revealedHints.length === 0) {
			const activeKeys = getActiveHintKeys()
			const revealedKeys = revealedHints.map(h => h.key)
			const unrevealedKeys = [...activeKeys].filter(k => !revealedKeys.includes(k))
			if (unrevealedKeys.length > 0 && hintCount < 3) revealNextHint()
			else if (unrevealedKeys.length === 0 || hintCount >= 3) setShowSolutionPrompt(true)
		}
	}

	function onHintPopoverDragStart(e) {
		if (e.target.closest('button')) return
		const el = hintPopoverRef.current
		if (!el) return
		const rect = el.getBoundingClientRect()
		setHintPopoverPosition({ left: rect.left, top: rect.top })
		hintDragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top }
		const onMove = (e) => {
			const d = hintDragRef.current
			if (!d) return
			setHintPopoverPosition({
				left: d.startLeft + (e.clientX - d.startX),
				top: d.startTop + (e.clientY - d.startY),
			})
		}
		const onUp = () => {
			window.removeEventListener('mousemove', onMove)
			window.removeEventListener('mouseup', onUp)
			hintDragRef.current = null
		}
		window.addEventListener('mousemove', onMove)
		window.addEventListener('mouseup', onUp)
	}

	useEffect(() => {
		isQuizModeRef.current = isQuizMode
		if (!isQuizMode) setShowQuizOptions(false)
	}, [isQuizMode])

	useEffect(() => {
		const el = mainAreaRef.current
		if (!el) return

		const measure = () => {
			const { width, height } = el.getBoundingClientRect()
			if (width < 100) return
			const computed = computeDefaultItems(width, height)
			setDefaultItems(computed)
			if (!isQuizModeRef.current) setItems(computed.map(item => ({ ...item })))
		}

		measure()

		const observer = new ResizeObserver(() => measure())
		observer.observe(el)
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		if (!isQuizMode || !showQuizOptions) return

		const handleKeyDown = e => {
			if (e.key === 'Escape') setShowQuizOptions(false)
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [isQuizMode, showQuizOptions])

	useEffect(() => {
		let interval
		if (showSuccess && !isPaused && countdown < 100 && !quizCompleted && quizHistory.length < quizQuestionCount) {
			interval = setInterval(() => {
				setCountdown(prev => {
					const next = prev + (100 / (QUIZ_DELAY_MS / 50))
					if (next >= 100) {
						clearInterval(interval)
						startNewQuiz()
						return 100
					}
					return next
				})
			}, 50)
		}
		return () => clearInterval(interval)
	}, [showSuccess, isPaused, countdown, quizCompleted, quizHistory, quizQuestionCount])

	useEffect(() => {
		if (!isQuizMode || historyIndex === -1 || historyIndex !== quizHistory.length - 1 || showSuccess) return
		const target = quizHistory[historyIndex]
		if (!target) return

		const normalizeAlign = v => (v === 'stretch' ? 'start' : v)

		const resolveAlignSelf = (selfVal, containerAlignItems) => {
			const resolved = selfVal === 'auto' ? containerAlignItems : selfVal
			return normalizeAlign(resolved)
		}

		const checkPropsMatch = () => {
			const containerOk =
				containerStyles.flexDirection === target.flexDirection &&
				containerStyles.justifyContent === target.justifyContent &&
				normalizeAlign(containerStyles.alignItems) === normalizeAlign(target.alignItems) &&
				containerStyles.flexWrap === (target.flexWrap || 'nowrap') &&
				containerStyles.gap === target.gap

			if (!containerOk) return false

			return items.slice(0, itemCount).every((item, idx) => {
				const def = defaultItems[idx] || item
				const ov = target.itemOverrides?.[item.id] || {}

				const userAlign = resolveAlignSelf(item.alignSelf, containerStyles.alignItems)
				const targetAlign = resolveAlignSelf(ov.alignSelf ?? def.alignSelf, target.alignItems)

				return userAlign === targetAlign &&
					item.flexGrow === (ov.flexGrow ?? def.flexGrow) &&
					item.flexShrink === (ov.flexShrink ?? def.flexShrink) &&
					item.order === (ov.order ?? def.order)
			})
		}

		const checkMatch = () => {
			if (!checkPropsMatch()) return
			if (scoredQuestionsRef.current.has(historyIndex)) return

			scoredQuestionsRef.current.add(historyIndex)
			setScore(s => s + 1)

			const isLastQuestion =
				quizHistory.length >= quizQuestionCount &&
				historyIndex === quizQuestionCount - 1

			if (isLastQuestion) {
				setQuizCompleted(true)
				setShowSuccess(false)
				setCountdown(0)
			} else {
				setShowSuccess(true)
				setCountdown(0)
			}
		}

		const timer = setTimeout(checkMatch, 350)
		return () => clearTimeout(timer)
	}, [containerStyles, items, quizHistory, historyIndex, isQuizMode, itemCount, showSuccess, quizQuestionCount, defaultItems])

	// Updated RadioGroup with reduced py-1 vertical padding
	const RadioGroup = ({ name, options, value, onChange, disabled, className = '' }) => (
		<div className={`flex gap-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
			{options.map((option) => (
				<label key={option} className="relative cursor-pointer shrink-0">
					<input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="sr-only peer" />
					<div className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 text-[13px] font-medium transition-all hover:bg-slate-50 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 peer-checked:shadow-sm whitespace-nowrap">
						{option}
					</div>
				</label>
			))}
		</div>
	)

	const ControlGroup = ({ label, defaultValue, children, className = '' }) => (
		<div className={`${className}`}>
			<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
				{label} {defaultValue && <span className="lowercase font-normal italic opacity-70">(default: {defaultValue})</span>}
			</label>
			{children}
		</div>
	)

	const handlePrevItem = (e) => { e.stopPropagation(); setSelectedId((prev) => Math.max(1, prev - 1)); setActiveTab('items') }
	const handleNextItem = (e) => { e.stopPropagation(); setSelectedId((prev) => Math.min(itemCount, prev + 1)); setActiveTab('items') }

	const quizTarget = quizHistory[historyIndex]

	// Axis derived states
	const isVerticalFlow = containerStyles.flexDirection.includes('column')
	const isReverse = containerStyles.flexDirection.includes('reverse')

	const getMainAreaRect = () => mainAreaRef.current?.getBoundingClientRect() ?? { width: 1000, height: 400 }

	const effectiveMaxWidth = containerMaxWidth
	const effectiveMaxHeight = containerMaxHeight

	function onRightHandleDrag(e) {
		e.preventDefault()
		const rect = getMainAreaRect()
		const startX = e.clientX
		const startW = effectiveMaxWidth ?? rect.width

		const onMove = ev => {
			const newW = Math.max(MIN_CONSTRAINT, Math.min(rect.width, startW + (ev.clientX - startX)))
			setContainerMaxWidth(Math.round(newW))
		}
		const onUp = () => {
			window.removeEventListener('mousemove', onMove)
			window.removeEventListener('mouseup', onUp)
		}
		window.addEventListener('mousemove', onMove)
		window.addEventListener('mouseup', onUp)
	}

	function onBottomHandleDrag(e) {
		e.preventDefault()
		const rect = getMainAreaRect()
		const startY = e.clientY
		const startH = effectiveMaxHeight ?? rect.height

		const onMove = ev => {
			const newH = Math.max(MIN_CONSTRAINT, Math.min(rect.height, startH + (ev.clientY - startY)))
			setContainerMaxHeight(Math.round(newH))
		}
		const onUp = () => {
			window.removeEventListener('mousemove', onMove)
			window.removeEventListener('mouseup', onUp)
		}
		window.addEventListener('mousemove', onMove)
		window.addEventListener('mouseup', onUp)
	}

	function onCornerHandleDrag(e) {
		e.preventDefault()
		const rect = getMainAreaRect()
		const startX = e.clientX
		const startY = e.clientY
		const startW = effectiveMaxWidth ?? rect.width
		const startH = effectiveMaxHeight ?? rect.height

		const onMove = ev => {
			const newW = Math.max(MIN_CONSTRAINT, Math.min(rect.width, startW + (ev.clientX - startX)))
			const newH = Math.max(MIN_CONSTRAINT, Math.min(rect.height, startH + (ev.clientY - startY)))
			setContainerMaxWidth(Math.round(newW))
			setContainerMaxHeight(Math.round(newH))
		}
		const onUp = () => {
			window.removeEventListener('mousemove', onMove)
			window.removeEventListener('mouseup', onUp)
		}
		window.addEventListener('mousemove', onMove)
		window.addEventListener('mouseup', onUp)
	}

	return (
		<div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 font-sans">
			<header className="max-w-7xl mx-auto mb-6 flex flex-row flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">Flexbox Playground</h1>
					<p className="text-slate-500 text-sm">Visualizing CSS Flexbox with real-time feedback.</p>
				</div>

				<div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-slate-200 overflow-hidden">
					<button
						onClick={() => { setIsQuizMode(false); setQuizHistory([]); setHistoryIndex(-1); setScore(0) }}
						className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 rounded-md font-bold text-xs transition-all ${!isQuizMode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
						title="Playground"
						aria-label="Playground"
					>
						<Gamepad2 size={14} />
						<span className="hidden md:inline">Playground</span>
					</button>
					<button
						onClick={() => { setIsQuizMode(true); setShowQuizOptions(true) }}
						className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 rounded-md font-bold text-xs transition-all ${isQuizMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
						title="Quiz Mode"
						aria-label="Quiz Mode"
					>
						<GraduationCap size={14} />
						<span className="hidden md:inline">Quiz Mode</span>
					</button>
				</div>
			</header>

			<main className="max-w-7xl mx-auto space-y-4">
				<div className="relative aspect-[21/8] flex flex-col w-full bg-slate-200 rounded-[2rem] overflow-hidden shadow-inner border-[10px] border-white">
					<div className="bg-white/60 backdrop-blur-md border-b border-white px-6 py-1.5 flex items-center justify-between min-h-[36px] z-30">
						<div className="flex items-center gap-2">
							{/* Box count */}
							<div className="flex items-center h-6 bg-white/80 rounded-md pl-1 pr-1.5 border border-white/50 shadow-sm">
								<button onClick={() => setItemCount(Math.max(1, itemCount - 1))} className="p-1 rounded hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600" aria-label="Decrease box count"><Minus size={12}/></button>
								<span className="text-xs font-bold w-4 text-center tabular-nums">{itemCount}</span>
								<button onClick={() => setItemCount(Math.min(5, itemCount + 1))} className="p-1 rounded hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600" aria-label="Increase box count"><Plus size={12}/></button>
							</div>
							<button
								onClick={() => setShowAxes(!showAxes)}
								className={`flex items-center justify-center h-6 w-6 rounded-md border transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-500 ${showAxes ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white/80 border-white/50 text-slate-400 hover:bg-white hover:text-slate-600'}`}
								title="Toggle axes overlay"
								aria-label={showAxes ? 'Hide axes overlay' : 'Show axes overlay'}
							>
								<Axis3d size={14} strokeWidth={2.5} />
							</button>
							<button
								type="button"
								onClick={resetAllToDefaults}
								className="flex items-center justify-center h-6 w-6 rounded-md border border-white/50 bg-white/80 shadow-sm text-slate-400 hover:bg-white hover:text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-500 transition-all"
								title="Reset container and items to defaults"
								aria-label="Reset container and all items to default values"
							>
								<ArrowLeftToLine size={14} strokeWidth={2.5} />
							</button>
							{isQuizMode && (
								<button
									type="button"
									onClick={() => setShowQuizOptions(true)}
									className="flex items-center gap-1 h-6 px-2 rounded-md border border-white/50 bg-white/80 shadow-sm text-[10px] font-semibold text-slate-600 hover:bg-white hover:text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-500 transition-all"
									title="Restart quiz"
									aria-label="Restart quiz"
								>
									<RotateCcw size={12} />
									<span className="hidden sm:inline">Restart Quiz</span>
								</button>
							)}
						</div>

						{isQuizMode && (
							<>
								<div className="flex-grow flex justify-center px-4">
								{quizCompleted ? (
									<div className="flex items-center gap-2 h-6">
										<div className="flex items-center h-6 bg-white/80 rounded-md border border-white/50 shadow-sm overflow-hidden">
											<button onClick={goBack} disabled={historyIndex <= 0} className="p-1.5 hover:bg-white/80 disabled:opacity-30 transition-all text-slate-600" title="Previous question" aria-label="Previous question"><ChevronLeft size={12} /></button>
											<span className="px-2 text-[10px] font-semibold text-slate-600 min-w-[3rem] text-center tabular-nums">
												{historyIndex + 1} / {quizQuestionCount}
											</span>
											<button onClick={goForward} disabled={historyIndex >= quizHistory.length - 1} className="p-1.5 hover:bg-white/80 disabled:opacity-30 transition-all text-slate-600" aria-label="Next question"><ChevronRight size={12} /></button>
										</div>
										<button
											onClick={() => setOutlineOnly(!outlineOnly)}
											aria-pressed={outlineOnly}
											aria-label={outlineOnly ? 'Show filled boxes' : 'Show outline only'}
											className={`flex items-center gap-1 h-6 px-2 rounded-md font-bold text-[8px] uppercase transition-all border ${outlineOnly ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white/80 border-white/50 text-slate-600 hover:bg-white'}`}
										>
											<Box size={12} />
											Outline
										</button>
									</div>
								) : showSuccess ? (
										<div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 w-full max-w-sm h-6">
											<div className="flex items-center gap-1.5 shrink-0">
												<PartyPopper className="text-emerald-500" size={14} />
												<span className="text-emerald-700 font-extrabold text-[10px] uppercase tracking-tight">Match!</span>
											</div>
											<div className="flex-grow flex items-center gap-2">
												<div className="flex-grow h-1 bg-emerald-100/50 rounded-full overflow-hidden">
													<div className="h-full bg-emerald-500 transition-all duration-75 ease-linear" style={{ width: `${countdown}%` }} />
												</div>
											</div>
											<div className="flex items-center gap-1 h-6">
												<button onClick={() => setIsPaused(!isPaused)} className="p-1 rounded hover:bg-emerald-100 text-emerald-600 transition-colors" aria-label={isPaused ? 'Resume' : 'Pause'}>
													{isPaused ? <Play size={12} /> : <Pause size={12} />}
												</button>
												<button onClick={skipToNext} className="h-6 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold shadow-sm">Next</button>
											</div>
											<button
												onClick={() => setOutlineOnly(!outlineOnly)}
												aria-pressed={outlineOnly}
												aria-label={outlineOnly ? 'Show filled boxes' : 'Show outline only'}
												className={`flex items-center gap-1 h-6 px-2 rounded-md font-bold text-[8px] uppercase transition-all border ${outlineOnly ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white/80 border-white/50 text-slate-600 hover:bg-white'}`}
											>
												<Box size={12} />
												Outline
											</button>
										</div>
									) : (
										<div className="flex items-center gap-2 h-6">
											<div className="flex items-center h-6 bg-white/80 rounded-md border border-white/50 shadow-sm overflow-hidden">
												<button onClick={goBack} disabled={historyIndex <= 0} className="p-1.5 hover:bg-white/80 disabled:opacity-30 transition-all text-slate-600" title="Previous question" aria-label="Previous question"><ChevronLeft size={12} /></button>
												<span className="px-2 text-[10px] font-semibold text-slate-600 min-w-[3rem] text-center tabular-nums" aria-live="polite">
													{historyIndex < 0 ? '—' : historyIndex + 1} / {quizQuestionCount}
												</span>
												<button onClick={goForward} disabled={historyIndex >= quizHistory.length - 1} className="p-1.5 hover:bg-white/80 disabled:opacity-30 transition-all text-slate-600" aria-label="Next question"><ChevronRight size={12} /></button>
											</div>
											<button onClick={handleHintClick} className={`flex items-center gap-1 h-6 px-2 rounded-md font-bold text-[8px] uppercase transition-all border ${showHint ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white/80 border-white/50 text-slate-600 hover:bg-white'}`}>
												{showHint ? <Eye size={12} /> : <EyeOff size={12} />} Hint
											</button>
											{showSolution && (
												<button onClick={skipToNext} className="h-6 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-bold shadow-sm">Next</button>
											)}
											<button
												onClick={() => setOutlineOnly(!outlineOnly)}
												aria-pressed={outlineOnly}
												aria-label={outlineOnly ? 'Show filled boxes' : 'Show outline only'}
												className={`flex items-center gap-1 h-6 px-2 rounded-md font-bold text-[8px] uppercase transition-all border ${outlineOnly ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white/80 border-white/50 text-slate-600 hover:bg-white'}`}
											>
												<Box size={12} />
												Outline
											</button>
										</div>
									)}
								</div>

								<div className="flex items-center min-w-[80px] justify-end">
								<div className="flex items-center gap-1 h-6 px-2 bg-amber-50 text-amber-700 rounded-md border border-amber-100 shadow-sm font-bold text-[9px]">
									<Award size={12} />
									<span className="tracking-tight">{score} Pts{hintCount > 0 ? ` · ${hintCount} hint${hintCount !== 1 ? 's' : ''}` : ''}</span>
								</div>
								</div>
							</>
						)}
						{!isQuizMode && <div className="min-w-[120px]" />}
					</div>

					<div ref={mainAreaRef} className="flex-grow relative bg-slate-200">
						{/* CONFETTI + SUCCESS MESSAGE OVERLAY — when quiz completes */}
						{isQuizMode && quizCompleted && (
							<div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex items-center justify-center" aria-hidden>
								{confettiPieces.length > 0 && confettiPieces.map((p, i) => (
									<div
										key={i}
										className="confetti-piece absolute"
										style={{
											left: `${p.left}%`,
											top: `${p.top}%`,
											width: p.size,
											height: p.size,
											backgroundColor: p.color,
											animationDelay: `${p.delay}s`,
											animationDuration: `${p.duration}s`,
											['--confetti-drift']: `${p.drift}px`,
											['--confetti-rotate']: `${p.rotate}deg`,
										}}
									/>
								))}
								<div className="quiz-complete-message relative z-10 flex flex-col items-center gap-0.5 text-center" aria-live="polite">
									<span className="text-emerald-700 font-extrabold tracking-tight">Quiz complete</span>
									<span className="text-emerald-600 font-black">{score} / {quizQuestionCount}</span>
								</div>
							</div>
						)}

						{/* CONSTRAINED WRAPPER */}
						<div
							className="absolute top-0 left-0"
							style={{
								width: effectiveMaxWidth ? `${effectiveMaxWidth}px` : '100%',
								height: effectiveMaxHeight ? `${effectiveMaxHeight}px` : '100%',
							}}
						>
							{/* AXES OVERLAY */}
							{showAxes && (
							<div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
								{/* Main axis line */}
								<div className={`absolute border-slate-400/30 border-dashed transition-all duration-500 ${isVerticalFlow ? 'left-1/2 top-0 bottom-0 border-l-2 -translate-x-1/2' : 'top-1/2 left-0 right-0 border-t-2 -translate-y-1/2'}`} />

								{/* Main axis arrow */}
								<div className={`absolute transition-all duration-500 text-slate-400/40 ${
									isVerticalFlow
										? (isReverse ? 'left-1/2 top-0 -translate-x-1/2 rotate-180' : 'left-1/2 bottom-0 -translate-x-1/2')
										: (isReverse ? 'top-1/2 left-0 -translate-y-1/2 rotate-180' : 'top-1/2 right-0 -translate-y-1/2')
								}`}>
									{isVerticalFlow ? <ArrowDown size={14} strokeWidth={4} /> : <ArrowRight size={14} strokeWidth={4} />}
								</div>

								{/* Main axis label */}
								<div className={`absolute text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400/40 transition-all duration-500 whitespace-nowrap ${
									isVerticalFlow
										? 'left-1/2 top-1/4 -translate-x-[calc(50%+1em)] -rotate-90 origin-center'
										: 'top-1/2 left-1/4 -translate-y-[calc(50%+1em)] -translate-x-1/2'
								}`}>
									Main Axis
								</div>

								{/* Cross axis line */}
								<div className={`absolute border-slate-400/30 border-dashed transition-all duration-500 ${isVerticalFlow ? 'top-1/2 left-0 right-0 border-t-2 -translate-y-1/2' : 'left-1/2 top-0 bottom-0 border-l-2 -translate-x-1/2'}`} />

								{/* Cross axis arrow */}
								<div className={`absolute transition-all duration-500 text-slate-400/40 ${
									isVerticalFlow ? 'top-1/2 right-0 -translate-y-1/2' : 'left-1/2 bottom-0 -translate-x-1/2'
								}`}>
									{isVerticalFlow ? <ArrowRight size={14} strokeWidth={4} /> : <ArrowDown size={14} strokeWidth={4} />}
								</div>

								{/* Cross axis label */}
								<div className={`absolute text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400/40 transition-all duration-500 whitespace-nowrap ${
									isVerticalFlow
										? 'top-1/2 left-1/4 -translate-y-[calc(50%+1em)] -translate-x-1/2'
										: 'left-1/2 top-1/4 -translate-x-[calc(50%+1em)] -rotate-90 origin-center'
								}`}>
									Cross Axis
								</div>
							</div>
							)}

							{/* QUIZ GHOSTS */}
							{isQuizMode && quizTarget && (
								<div ref={ghostContainerRef} className="absolute inset-0 pointer-events-none transition-flex z-0" style={{ display: 'flex', flexDirection: quizTarget.flexDirection, justifyContent: quizTarget.justifyContent, alignItems: quizTarget.alignItems, flexWrap: quizTarget.flexWrap || 'nowrap', gap: quizTarget.gap, padding: '30px', boxSizing: 'border-box' }}>
									{items.slice(0, itemCount).map((item, idx) => {
										const defaultItem = defaultItems[idx] || item
										const overrides = quizTarget.itemOverrides?.[item.id] || {}
										return (
											<div key={`target-${item.id}`} className="flex items-center justify-center" style={{ width: item.width, height: item.height, minWidth: 0, minHeight: 0, backgroundColor: 'rgba(71, 85, 105, 0.2)', borderRadius: '16px', outline: '2px dashed rgba(30, 41, 55, 0.2)', outlineOffset: '-2px', boxSizing: 'border-box', order: overrides.order ?? defaultItem.order, alignSelf: overrides.alignSelf ?? defaultItem.alignSelf, flexGrow: overrides.flexGrow ?? defaultItem.flexGrow, flexShrink: overrides.flexShrink ?? defaultItem.flexShrink }}>
												<span className="font-bold text-2xl" style={{ opacity: 0 }}>{item.id}</span>
											</div>
										)
									})}
								</div>
							)}

							{/* REAL ITEMS */}
							<div ref={realContainerRef} className="absolute inset-0 transition-flex z-20" style={{ display: containerStyles.display, flexDirection: containerStyles.flexDirection, justifyContent: containerStyles.justifyContent, alignItems: containerStyles.alignItems, flexWrap: containerStyles.flexWrap, gap: containerStyles.gap, padding: '30px', boxSizing: 'border-box', border: '1px solid rgba(148, 163, 184, 0.35)' }} onClick={() => { setActiveTab('properties'); setSelectedId(0) }}>
								{items.slice(0, itemCount).map((item) => {
									const itemColor = `hsl(${item.id * 50 + 200}, 70%, 60%)`
									const isOutline = outlineOnly
									return (
										<div
											key={item.id}
											onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); setActiveTab('items') }}
											className={`relative flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 shadow-xl transition-item ${selectedId === item.id ? 'z-10' : ''}`}
											style={{
												width: item.width,
												height: item.height,
												minWidth: 0,
												minHeight: 0,
												backgroundColor: isOutline ? 'transparent' : itemColor,
												opacity: isOutline ? 1 : itemOpacity,
												color: !isOutline ? 'white' : undefined,
												borderRadius: '16px',
												alignSelf: item.alignSelf,
												flexGrow: item.flexGrow,
												flexShrink: item.flexShrink,
												order: item.order,
												boxSizing: 'border-box',
												border: isOutline ? `2px solid ${itemColor}` : undefined,
												outline: selectedId === item.id ? '2px solid white' : undefined,
												outlineOffset: selectedId === item.id ? '-2px' : undefined,
											}}
										>
											<span className={`font-bold text-2xl ${isOutline ? 'text-slate-500 opacity-50' : 'drop-shadow-sm'}`}>{item.id}</span>
										</div>
									)
								})}
							</div>
						</div>

						{/* RESIZE HANDLES */}
						{/* Right handle */}
						<div
							className="resize-handle resize-handle-right absolute top-0 z-30 flex items-center justify-center"
							style={{
								left: effectiveMaxWidth ? `${effectiveMaxWidth - 8}px` : 'calc(100% - 8px)',
								width: '16px',
								height: effectiveMaxHeight ? `${effectiveMaxHeight}px` : '100%',
								cursor: 'col-resize',
							}}
							onMouseDown={onRightHandleDrag}
							onDoubleClick={() => setContainerMaxWidth(null)}
							title="Drag to resize width (double-click to reset)"
							aria-label="Resize container width"
						>
							<GripVertical size={14} className="handle-grip absolute left-1/2 top-1/2 -translate-x-[105%] -translate-y-[145%] -mt-[2px] text-slate-400/70 drop-shadow-sm transition-all" aria-hidden />
						</div>

						{/* Bottom handle */}
						<div
							className="resize-handle resize-handle-bottom absolute left-0 z-30 flex items-center justify-center"
							style={{
								top: effectiveMaxHeight ? `${effectiveMaxHeight - 8}px` : 'calc(100% - 8px)',
								height: '16px',
								width: effectiveMaxWidth ? `${effectiveMaxWidth}px` : '100%',
								cursor: 'row-resize',
							}}
							onMouseDown={onBottomHandleDrag}
							onDoubleClick={() => setContainerMaxHeight(null)}
							title="Drag to resize height (double-click to reset)"
							aria-label="Resize container height"
						>
							<GripVertical size={14} className="handle-grip absolute left-1/2 top-1/2 -translate-y-[105%] translate-x-[95%] -ml-[3px] rotate-90 text-slate-400/70 drop-shadow-sm transition-all" aria-hidden />
						</div>

						{/* Corner handle */}
						<div
							className="resize-handle resize-handle-corner absolute z-30 flex items-center justify-center"
							style={{
								left: effectiveMaxWidth ? `min(${effectiveMaxWidth - 10}px, calc(100% - 26px))` : 'calc(100% - 26px)',
								top: effectiveMaxHeight ? `min(${effectiveMaxHeight - 10}px, calc(100% - 26px))` : 'calc(100% - 26px)',
								width: '20px',
								height: '20px',
								cursor: 'nwse-resize',
							}}
							onMouseDown={onCornerHandleDrag}
							onDoubleClick={() => { setContainerMaxWidth(null); setContainerMaxHeight(null) }}
							title="Drag to resize both axes (double-click to reset)"
							aria-label="Resize container width and height"
						>
							<svg width="12" height="12" viewBox="0 0 12 12" className="handle-grip text-slate-400/40 transition-all">
								<line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" strokeWidth="1.5" />
								<line x1="6" y1="12" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" />
								<line x1="10" y1="12" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5" />
							</svg>
						</div>

						{/* QUIZ HINTS POPOVER */}
						{isQuizMode && showHint && quizTarget && (() => {
							const activeKeys = getActiveHintKeys()
							const revealedKeys = revealedHints.map(h => h.key)
							const remaining = [...activeKeys].filter(k => !revealedKeys.includes(k)).length
							const hintEntries = revealedHints.map(h => ({
								...h,
								resolved: !activeKeys.has(h.key),
							}))

							return (
							<div
								ref={hintPopoverRef}
								className="z-40 max-w-sm"
								style={hintPopoverPosition
									? { position: 'fixed', left: hintPopoverPosition.left, top: hintPopoverPosition.top }
									: { position: 'absolute', bottom: '1rem', right: '1rem' }}
							>
								<div className="relative bg-white/95 border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs text-slate-700">
									<div
										className="flex items-center justify-between gap-2 mb-1.5 cursor-grab active:cursor-grabbing"
										onMouseDown={onHintPopoverDragStart}
										role="presentation"
									>
										<div className="flex items-center gap-1.5">
											<GripVertical size={12} className="text-slate-300 shrink-0" aria-hidden />
											<Eye className="text-indigo-500" size={12} />
											<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
												{hintEntries.length === 0 ? 'No hints needed' : `${hintEntries.length} / 3 hints used`}
											</span>
											<span className="relative group">
												<Info size={11} className="text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
												<span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 rounded-lg bg-slate-800 text-white text-[10px] leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
													Hints point to one known solution. There may be other valid approaches.
												</span>
											</span>
										</div>
										<button
											type="button"
											onClick={() => { setShowHint(false); setShowSolutionConfirm(false) }}
											className="text-slate-400 hover:text-slate-600 text-[10px] font-bold px-1 rounded-md hover:bg-slate-100"
											aria-label="Close hint"
										>
											✕
										</button>
									</div>

									{hintEntries.length > 0 ? (
										<>
											<ul className="space-y-1.5">
												{hintEntries.map((entry, i) => (
													<li key={i} className={`leading-snug flex items-start gap-1.5 ${entry.resolved ? 'text-emerald-600' : ''}`}>
														{entry.resolved
															? <Check size={14} className="shrink-0 mt-0.5 text-emerald-500" />
															: <span className="shrink-0 w-[14px] mt-0.5 text-center text-slate-300 font-bold">•</span>}
														<span>{entry.text}</span>
													</li>
												))}
											</ul>
										</>
									) : (
										<p className="leading-snug text-emerald-600">Everything looks correct so far!</p>
									)}

									{!showSolution && (remaining > 0 && hintCount < 3 || showSolutionPrompt || hintCount >= 3) && (
										<div className="mt-2 pt-2 border-t border-slate-200 flex justify-end">
											{showSolutionConfirm ? (
												<span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
													Are you sure?
													<button
														type="button"
														onClick={() => { setShowSolution(true); setShowSolutionConfirm(false) }}
														className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
													>
														Yes
													</button>
													<button
														type="button"
														onClick={() => setShowSolutionConfirm(false)}
														className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-500 hover:bg-slate-200"
													>
														Cancel
													</button>
												</span>
											) : hintCount >= 3 || showSolutionPrompt ? (
												<button
													type="button"
													onClick={() => setShowSolutionConfirm(true)}
													className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-semibold hover:bg-indigo-700"
												>
													Show solution
												</button>
											) : (
												<button
													type="button"
													onClick={revealNextHint}
													className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-bold hover:bg-amber-200 transition-colors"
												>
													Give me another hint
												</button>
											)}
										</div>
									)}

									{showSolution && (
										<div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-[10px] font-mono text-slate-600">
											<div>
												flex-direction: <b className="text-pink-500">{String(quizTarget.flexDirection).toLowerCase()}</b>;
											</div>
											<div>
												justify-content: <b className="text-emerald-500">{String(quizTarget.justifyContent).toLowerCase()}</b>;
											</div>
											<div>
												align-items: <b className="text-sky-500">{String(quizTarget.alignItems).toLowerCase()}</b>;
											</div>
											<div>
												flex-wrap: <b className="text-purple-500">{String(quizTarget.flexWrap || 'nowrap').toLowerCase()}</b>;
											</div>
											<div>
												gap: <b className="text-amber-500">{String(quizTarget.gap).toLowerCase()}</b>;
											</div>
											{quizTarget.itemOverrides && Object.keys(quizTarget.itemOverrides).length > 0 && (
												<div className="pt-1 space-y-0.5">
													{Object.entries(quizTarget.itemOverrides).map(([id, ov]) => (
														<div key={id} className="flex flex-wrap gap-2">
															<span className="font-bold text-violet-500">#{id}</span>
															{ov.alignSelf && (
																<span>
																	align-self: <b className="text-sky-500">{String(ov.alignSelf).toLowerCase()}</b>;
																</span>
															)}
															{ov.order !== undefined && (
																<span>
																	order: <b className="text-amber-500">{String(ov.order).toLowerCase()}</b>;
																</span>
															)}
															{ov.flexGrow !== undefined && (
																<span>
																	flex-grow: <b className="text-emerald-500">{String(ov.flexGrow).toLowerCase()}</b>;
																</span>
															)}
															{ov.flexShrink !== undefined && (
																<span>
																	flex-shrink: <b className="text-rose-500">{String(ov.flexShrink).toLowerCase()}</b>;
																</span>
															)}
														</div>
													))}
												</div>
											)}
										</div>
									)}
								</div>
							</div>
							)
						})()}
					</div>
				</div>

				<div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
					<div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1">
						<div className={`flex-1 flex items-center justify-center min-w-0 rounded-tl-[1.5rem] rounded-tr-xl rounded-br-xl rounded-bl-xl cursor-pointer ${activeTab === 'properties' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => { setActiveTab('properties'); setSelectedId(0) }} role="tab" aria-selected={activeTab === 'properties'}>
							<span className="relative inline-flex items-center">
								<button type="button" onClick={() => { setActiveTab('properties'); setSelectedId(0) }} className="flex items-center justify-center gap-1.5 py-1.5 px-6 font-bold text-sm transition-all text-inherit bg-transparent border-0 cursor-pointer">
									<SlidersHorizontal size={14} />Container
								</button>
								{isContainerTainted && (
									<button
										type="button"
										onClick={e => { e.stopPropagation(); resetContainerCode() }}
										className="absolute left-full ml-1 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 transition-colors"
										title="Reset container to defaults"
										aria-label="Reset container to defaults"
									>
										<ArrowLeftToLine size={12} strokeWidth={2.5} />
									</button>
								)}
							</span>
						</div>
						<div className={`flex-1 relative flex items-center justify-between min-w-0 rounded-xl transition-all cursor-pointer ${activeTab === 'items' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => { if (selectedId === 0) setSelectedId(1); setActiveTab('items') }} role="tab" aria-selected={activeTab === 'items'}>
							<button type="button" onClick={handlePrevItem} disabled={selectedId <= 1} className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all text-slate-400 shrink-0" aria-label="Previous item"><ChevronLeft size={14}/></button>
							<div className="flex-1 flex justify-center items-center min-w-0 py-1.5">
								<span className="relative inline-flex items-center gap-1 font-bold text-sm select-none">
									<Box size={14} /><span>Item {selectedId > 0 ? selectedId : 1}</span>
									{isCurrentItemTainted && (
										<button
											type="button"
											onClick={e => { e.stopPropagation(); resetItemCode(selectedId > 0 ? selectedId : 1) }}
											className="absolute left-full ml-7 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 transition-colors"
											title="Reset this item to defaults"
											aria-label="Reset this item to defaults"
										>
											<ArrowLeftToLine size={12} strokeWidth={2.5} />
										</button>
									)}
								</span>
							</div>
							<button type="button" onClick={handleNextItem} disabled={selectedId >= itemCount} className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all text-slate-400 shrink-0" aria-label="Next item"><ChevronRight size={14}/></button>
						</div>
						<button onClick={() => setActiveTab('code')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-6 rounded-tr-[1.5rem] rounded-tl-xl rounded-bl-xl rounded-br-xl font-bold text-sm transition-all ${activeTab === 'code' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>
							<FileCode size={14} />Code Editor
						</button>
					</div>

					<div className="p-5 min-h-[280px]">
						{activeTab === 'properties' && (
							<div className="animate-in fade-in duration-300">
								<div className="flex flex-col gap-4">
									<div className="flex flex-wrap items-end gap-8 mt-2">
										<ControlGroup label="Display Mode">
											<RadioGroup name="display" options={['flex', 'block']} value={containerStyles.display} onChange={(val) => setContainerStyles({ ...containerStyles, display: val })} />
										</ControlGroup>
										{containerStyles.display === 'flex' && (
											<ControlGroup label={`Gap: ${containerStyles.gap}`}>
												<div className="flex items-center gap-3 h-[30px]">
													<input type="range" min="0" max="20" step="5" value={parseInt(containerStyles.gap)} onChange={(e) => setContainerStyles({ ...containerStyles, gap: `${e.target.value}px` })} className="w-32 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500" />
													<span className="text-[11px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded-md min-w-[28px] text-center">{containerStyles.gap}</span>
												</div>
											</ControlGroup>
										)}
									</div>

									{containerStyles.display === 'flex' && (
										<>
											<ControlGroup label="Flex Direction" defaultValue="row">
												<RadioGroup name="flexDirection" options={flexValues.flexDirection} value={containerStyles.flexDirection} onChange={(val) => setContainerStyles({ ...containerStyles, flexDirection: val })} />
											</ControlGroup>

											<ControlGroup label="Justify Content" defaultValue="start">
												<div className="overflow-x-auto pb-1 scrollbar-hide">
													<RadioGroup name="justifyContent" options={flexValues.justifyContent} value={containerStyles.justifyContent} onChange={(val) => setContainerStyles({ ...containerStyles, justifyContent: val })} className="flex-nowrap" />
												</div>
											</ControlGroup>

											<ControlGroup label="Align Items" defaultValue="stretch">
												<RadioGroup name="alignItems" options={flexValues.alignItems} value={containerStyles.alignItems} onChange={(val) => setContainerStyles({ ...containerStyles, alignItems: val })} />
											</ControlGroup>

											<ControlGroup label="Flex Wrap" defaultValue="nowrap">
												<RadioGroup name="flexWrap" options={flexValues.flexWrap} value={containerStyles.flexWrap} onChange={(val) => setContainerStyles({ ...containerStyles, flexWrap: val })} />
											</ControlGroup>
										</>
									)}
								</div>
							</div>
						)}

						{activeTab === 'items' && (
							<div className="animate-in fade-in duration-300">
								<div className="flex items-center gap-2 mb-4">
									<Box className="text-emerald-600" size={18} />
									<h3 className="font-bold text-lg text-slate-800 leading-none">Item {selectedId > 0 ? selectedId : 1} Overrides</h3>
								</div>

								<div className="flex flex-col gap-4">
									<ControlGroup label="Align Self" defaultValue="auto" className="mb-0">
										<RadioGroup
											name="alignSelf" options={flexValues.alignSelf}
											value={items[(selectedId > 0 ? selectedId : 1) - 1].alignSelf}
											onChange={(val) => { const newItems = [...items]; newItems[(selectedId > 0 ? selectedId : 1) - 1].alignSelf = val; setItems(newItems) }}
										/>
									</ControlGroup>

									<div className="flex gap-3">
										<ControlGroup label="Flex Grow" defaultValue="0" className="mb-0">
											<input
												type="number" min="0" max="10"
												value={items[(selectedId > 0 ? selectedId : 1) - 1].flexGrow}
												onChange={(e) => { const newItems = [...items]; newItems[(selectedId > 0 ? selectedId : 1) - 1].flexGrow = parseInt(e.target.value) || 0; setItems(newItems) }}
												className="w-14 px-3 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-[13px] shadow-sm focus:ring-2 focus:ring-blue-500 h-[30px] box-border"
											/>
										</ControlGroup>
										<ControlGroup label="Flex Shrink" defaultValue="1" className="mb-0">
											<input
												type="number" min="0" max="10"
												value={items[(selectedId > 0 ? selectedId : 1) - 1].flexShrink}
												onChange={(e) => { const newItems = [...items]; newItems[(selectedId > 0 ? selectedId : 1) - 1].flexShrink = parseInt(e.target.value) || 0; setItems(newItems) }}
												className="w-14 px-3 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-[13px] shadow-sm focus:ring-2 focus:ring-blue-500 h-[30px] box-border"
											/>
										</ControlGroup>
										<ControlGroup label="Order" defaultValue="0" className="mb-0">
											<input
												type="number" min="-99" max="99"
												value={items[(selectedId > 0 ? selectedId : 1) - 1].order}
												onChange={(e) => { const newItems = [...items]; newItems[(selectedId > 0 ? selectedId : 1) - 1].order = parseInt(e.target.value) || 0; setItems(newItems) }}
												className="w-14 px-3 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-[13px] shadow-sm focus:ring-2 focus:ring-blue-500 h-[30px] box-border"
											/>
										</ControlGroup>
									</div>
								</div>
							</div>
						)}

						{activeTab === 'code' && (
							<div className="bg-slate-900 rounded-[1rem] overflow-visible flex flex-col min-h-[280px] animate-in fade-in duration-300 pt-1">
								<div className="flex items-center justify-between gap-4 px-4 py-2 bg-slate-800/80 border-b border-slate-800 -mt-1 overflow-visible rounded-t-[1rem]">
									<div className="flex items-center flex-nowrap overflow-x-auto min-w-0 scrollbar-hide min-h-[2.25rem]">
										<div className="flex items-center gap-2 flex-nowrap shrink-0">
											<span className="text-slate-400 text-xs font-mono flex items-center gap-1.5 w-[8.5rem] shrink-0"><FileCode size={12} /> {activeCodeTab === 'container' ? 'container' : `item-${activeCodeTab}`}.css</span>
											<div className="flex items-center gap-2 flex-nowrap ml-10 shrink-0">
											<div className="relative inline-block">
												<button onClick={() => setActiveCodeTab('container')} className={`block px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors text-left ${activeCodeTab === 'container' ? 'text-emerald-400 bg-slate-900/80' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'}`}>
													Container
												</button>
												{containerCodeDirty && (
													<span
														role="button"
														tabIndex={0}
														onClick={(e) => { e.stopPropagation(); e.preventDefault(); resetContainerCode() }}
														onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetContainerCode() } }}
														className="absolute -top-0.5 -right-1 inline-flex items-center justify-center p-0.5 rounded-full bg-slate-900 text-emerald-400 shadow-inner border border-slate-400 hover:bg-slate-700 hover:text-emerald-300 transition-colors cursor-pointer z-10"
														title="Reset to default"
														aria-label="Reset container code to default"
													>
														<ArrowLeftToLine size={12} strokeWidth={2.5} />
													</span>
												)}
											</div>
											{items.slice(0, itemCount).map((item) => (
												<div key={item.id} className="relative inline-block">
													<button onClick={() => setActiveCodeTab(item.id)} className={`block px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors text-left ${activeCodeTab === item.id ? 'text-emerald-400 bg-slate-900/80' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'}`}>
														Item {item.id}
													</button>
													{itemCodeDirty[item.id - 1] && (
														<span
															role="button"
															tabIndex={0}
															onClick={(e) => { e.stopPropagation(); e.preventDefault(); resetItemCode(item.id) }}
															onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetItemCode(item.id) } }}
															className="absolute -top-0.5 -right-1 inline-flex items-center justify-center p-0.5 rounded-full bg-slate-900 text-emerald-400 shadow-inner border border-slate-400 hover:bg-slate-700 hover:text-emerald-300 transition-colors cursor-pointer z-10"
															title="Reset to default"
															aria-label={`Reset item ${item.id} code to default`}
														>
															<ArrowLeftToLine size={12} strokeWidth={2.5} />
														</span>
													)}
												</div>
											))}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1 shrink-0">
										<button
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(getDisplayedCode())
													setCopyFeedback(true)
													setTimeout(() => setCopyFeedback(false), 2000)
												} catch (_) {}
											}}
											className={`flex items-center gap-1.5 transition-colors p-1.5 rounded-lg ${copyFeedback ? 'text-emerald-400 bg-emerald-500/20' : 'text-slate-500 hover:text-white hover:bg-slate-700'}`}
											title={copyFeedback ? 'Copied!' : 'Copy to clipboard'}
											aria-label={copyFeedback ? 'Copied to clipboard' : 'Copy code to clipboard'}
										>
											{copyFeedback ? <Check size={16} /> : <Copy size={16} />}
											{copyFeedback && <span className="text-[10px] font-bold text-emerald-400">Copied!</span>}
										</button>
									</div>
								</div>
								<div className="flex-grow rounded-b-[1rem] overflow-hidden bg-slate-900">
									<textarea
										key={`${activeCodeTab}-${codeResetKey}`}
										value={getDisplayedCode()}
										onChange={activeCodeTab === 'container' ? handleCssEdit : (e) => handleItemCssEdit(e, activeCodeTab)}
										spellCheck="false"
										className="w-full h-full min-h-[200px] p-6 bg-transparent text-emerald-400 font-mono text-base resize-none outline-none leading-relaxed block"
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>

			{isQuizMode && showQuizOptions && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="quiz-options-title"
					onClick={() => setShowQuizOptions(false)}
				>
					<div
						className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-5 space-y-4"
						onClick={e => e.stopPropagation()}
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<h2 id="quiz-options-title" className="text-lg font-bold text-slate-900">Quiz options</h2>
								<p className="mt-1 text-xs text-slate-500">
									Choose which kinds of flexbox changes to include in this quiz.
								</p>
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Difficulty preset</p>
								<div className="flex gap-1.5" role="radiogroup" aria-label="Quiz difficulty preset">
									{['easy', 'medium', 'hard', 'custom'].map(level => (
										<button
											key={level}
											type="button"
											onClick={() => applyDifficultyPreset(level)}
											className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-all ${
												quizDifficulty === level
													? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
													: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
											}`}
											aria-pressed={quizDifficulty === level}
										>
											{level}
										</button>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 gap-2">
								<label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/60 cursor-pointer">
									<div className="text-xs text-slate-700">
										<p className="font-semibold">Individual item alignment</p>
										<p className="text-[10px] text-slate-500">Include align-self overrides on specific boxes.</p>
									</div>
									<input
										type="checkbox"
										checked={quizIncludeItemProps}
										onChange={e => { setQuizIncludeItemProps(e.target.checked); if (quizDifficulty !== 'custom') setQuizDifficulty('custom') }}
										className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
										aria-label="Toggle individual item configuration in quiz"
									/>
								</label>

								<label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/60 cursor-pointer">
									<div className="text-xs text-slate-700">
										<p className="font-semibold">Order configuration</p>
										<p className="text-[10px] text-slate-500">Allow reordering items using the order property.</p>
									</div>
									<input
										type="checkbox"
										checked={quizIncludeOrder}
										onChange={e => { setQuizIncludeOrder(e.target.checked); if (quizDifficulty !== 'custom') setQuizDifficulty('custom') }}
										className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
										aria-label="Toggle order configuration in quiz"
									/>
								</label>

								<label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/60 cursor-pointer">
									<div className="text-xs text-slate-700">
										<p className="font-semibold">Shrink &amp; grow configuration</p>
										<p className="text-[10px] text-slate-500">Include flex-grow and flex-shrink changes.</p>
									</div>
									<input
										type="checkbox"
										checked={quizIncludeShrinkGrow}
										onChange={e => { setQuizIncludeShrinkGrow(e.target.checked); if (quizDifficulty !== 'custom') setQuizDifficulty('custom') }}
										className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
										aria-label="Toggle shrink and grow configuration in quiz"
									/>
								</label>

								<label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/60 cursor-pointer">
									<div className="text-xs text-slate-700">
										<p className="font-semibold">Flex wrap</p>
										<p className="text-[10px] text-slate-500">Include flex-wrap with constrained container sizes.</p>
									</div>
									<input
										type="checkbox"
										checked={quizIncludeFlexWrap}
										onChange={e => { setQuizIncludeFlexWrap(e.target.checked); if (quizDifficulty !== 'custom') setQuizDifficulty('custom') }}
										className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
										aria-label="Toggle flex wrap in quiz"
									/>
								</label>
							</div>

							<div>
								<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
									Number of questions
								</label>
								<div className="flex items-center gap-3">
									<input
										type="range"
										min="4"
										max="20"
										step="1"
										value={quizQuestionCount}
										onChange={e => setQuizQuestionCount(parseInt(e.target.value, 10) || 4)}
										className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
										aria-label="Number of questions in quiz"
									/>
									<span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-mono font-bold text-slate-700 min-w-[2.5rem]">
										{quizQuestionCount}
									</span>
								</div>
							</div>
						</div>

						<div className="flex justify-between items-center pt-2">
							<button
								type="button"
								onClick={() => setShowQuizOptions(false)}
								className="text-xs font-semibold text-slate-500 hover:text-slate-700"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => { setShowQuizOptions(false); startQuizSession() }}
								className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
							>
								<PlayCircle size={16} />
								Start quiz
							</button>
						</div>
					</div>
				</div>
			)}

			<style>{`
        input[type='range']::-webkit-slider-thumb {
          width: 18px;
          height: 18px;
          background: #2563eb;
          border-radius: 50%;
          border: 3px solid white;
          cursor: pointer;
          -webkit-appearance: none;
          box-shadow: 0 2px 6px rgb(0 0 0 / 0.1);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .transition-flex {
          transition-property: flex-direction, justify-content, align-items, flex-wrap, gap, opacity;
          transition-duration: 300ms;
          transition-timing-function: ease;
        }
        .transition-item {
          transition-property: transform, opacity, background-color, box-shadow, outline, border-color;
          transition-duration: 300ms;
          transition-timing-function: ease;
        }
        .resize-handle:hover .handle-grip,
        .resize-handle:active .handle-grip {
          color: rgba(59, 130, 246, 0.7);
          scale: 1.15;
        }
        .resize-handle-corner:hover .handle-grip,
        .resize-handle-corner:active .handle-grip {
          color: rgba(59, 130, 246, 0.7);
        }
        @keyframes confetti-fall {
          to {
            transform: translateY(120vh) translateX(var(--confetti-drift, 0)) rotate(var(--confetti-rotate, 0deg));
            opacity: 0.6;
          }
        }
        .confetti-piece {
          border-radius: 1px;
          animation: confetti-fall linear forwards;
          will-change: transform;
        }
        @keyframes quiz-complete-dissolve {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          25% { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.02); filter: blur(4px); }
        }
        .quiz-complete-message {
          font-size: clamp(2rem, 6vw, 4rem);
          line-height: 1.1;
          animation: quiz-complete-dissolve 8s ease-out forwards;
        }
      `}</style>
		</div>
	)
}

export default App
