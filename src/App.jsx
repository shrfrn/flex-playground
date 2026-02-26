import React, { useState, useEffect, useRef } from 'react'
import {
	Settings, Play, Code, Plus, Minus,
	Copy, Check, Undo2, Award, PartyPopper, Eye, EyeOff, Layout as LayoutIcon,
	ChevronLeft, ChevronRight, Pause, PlayCircle, SkipForward,
	SlidersHorizontal, FileCode, Box, GraduationCap, Gamepad2,
	ArrowRight, ArrowDown, Axis3d, GripVertical, Info,
} from 'lucide-react'

const DEFAULT_CONTAINER_STYLES = {
	display: 'flex',
	flexDirection: 'row',
	justifyContent: 'start',
	alignItems: 'stretch',
	gap: '10px',
}

const DEFAULT_ITEMS = [
	{ id: 1, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '60px', height: '60px' },
	{ id: 2, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '80px', height: '50px' },
	{ id: 3, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '50px', height: '80px' },
	{ id: 4, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '70px', height: '40px' },
	{ id: 5, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, order: 0, width: '90px', height: '70px' },
]

function generateContainerCssFromDefaults() {
	const c = DEFAULT_CONTAINER_STYLES
	let css = `.container {\n  display: ${c.display};\n`
	if (c.display === 'flex') {
		css += `  flex-direction: ${c.flexDirection};\n`
		css += `  justify-content: ${c.justifyContent};\n`
		css += `  align-items: ${c.alignItems};\n`
		css += `  gap: ${c.gap};\n`
	}
	css += `}\n`
	return css.trim()
}

function generateItemCssFromDefaults(itemIndex) {
	const item = DEFAULT_ITEMS[itemIndex - 1]
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
	const [itemOpacity, setItemOpacity] = useState(1)
	const [outlineOnly, setOutlineOnly] = useState(false) // Toggle: transparent bg + thin outline, no text
	const [quizDifficulty, setQuizDifficulty] = useState('medium') // 'easy' | 'medium' | 'hard' | 'custom'
	const [showAxes, setShowAxes] = useState(true) // Toggle for axis visibility
	const [showQuizOptions, setShowQuizOptions] = useState(false)
	const [quizIncludeItemProps, setQuizIncludeItemProps] = useState(true)
	const [quizIncludeOrder, setQuizIncludeOrder] = useState(true)
	const [quizIncludeShrinkGrow, setQuizIncludeShrinkGrow] = useState(false)
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

	// Container Styles
	const [containerStyles, setContainerStyles] = useState({ ...DEFAULT_CONTAINER_STYLES })

	// Individual Item Styles
	const [items, setItems] = useState(DEFAULT_ITEMS.map((item) => ({ ...item })))

	const [cssCode, setCssCode] = useState('')
	const [itemCodes, setItemCodes] = useState(() => Array(5).fill(''))
	const [containerCodeDirty, setContainerCodeDirty] = useState(false)
	const [itemCodeDirty, setItemCodeDirty] = useState(() => Array(5).fill(false))
	const [codeResetKey, setCodeResetKey] = useState(0)
	const [copyFeedback, setCopyFeedback] = useState(false)
	const realContainerRef = useRef(null)
	const ghostContainerRef = useRef(null)
	const lastUpdateFromCodeEditorRef = useRef(false)
	const lastUpdateFromItemCodeEditorRef = useRef(false)
	const [hintPopoverPosition, setHintPopoverPosition] = useState(null)
	const hintPopoverRef = useRef(null)
	const hintDragRef = useRef(null)

	const flexValues = {
		flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
		justifyContent: ['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly'],
		alignItems: ['stretch', 'start', 'end', 'center', 'baseline'],
		alignSelf: ['auto', 'start', 'end', 'center', 'baseline', 'stretch'],
	}

	const applyDifficultyPreset = preset => {
		setQuizDifficulty(preset)

		if (preset === 'custom') return

		if (preset === 'easy') {
			setQuizIncludeItemProps(false)
			setQuizIncludeOrder(false)
			setQuizIncludeShrinkGrow(false)
			return
		}

		if (preset === 'medium') {
			setQuizIncludeItemProps(true)
			setQuizIncludeOrder(true)
			setQuizIncludeShrinkGrow(false)
			return
		}

		if (preset === 'hard') {
			setQuizIncludeItemProps(true)
			setQuizIncludeOrder(true)
			setQuizIncludeShrinkGrow(true)
		}
	}

	const generateContainerCss = () => {
		let css = `.container {\n  display: ${containerStyles.display};\n`
		if (containerStyles.display === 'flex') {
			css += `  flex-direction: ${containerStyles.flexDirection};\n`
			css += `  justify-content: ${containerStyles.justifyContent};\n`
			css += `  align-items: ${containerStyles.alignItems};\n`
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
		setCodeResetKey(k => k + 1)
	}
	const resetItemCode = (itemIndex) => {
		setItems(prev => prev.map((it, i) => (i === itemIndex - 1 ? { ...DEFAULT_ITEMS[itemIndex - 1] } : it)))
		setItemCodes(prev => {
			const next = [...prev]
			next[itemIndex - 1] = generateItemCssFromDefaults(itemIndex)
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
		setItems(DEFAULT_ITEMS.map(item => ({ ...item })))
		setItemCodes(DEFAULT_ITEMS.map((_, idx) => generateItemCssFromDefaults(idx + 1)))
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
			gap: `${Math.floor(Math.random() * 5) * 5}px`,
		}

		const hasItemLevelConfig = quizIncludeItemProps || quizIncludeOrder || quizIncludeShrinkGrow
		if (!hasItemLevelConfig) return containerProps

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
			const defaultVisual = getVisualOrder(activeItems, it => DEFAULT_ITEMS.find(d => d.id === it.id)?.order ?? 0)
			const shuffled = [...defaultVisual].sort(() => Math.random() - 0.5)
			const isIdentical = shuffled.every((id, i) => id === defaultVisual[i])

			if (!isIdentical) {
				shuffled.forEach((id, visualIdx) => {
					if (!itemOverrides[id]) itemOverrides[id] = {}
					itemOverrides[id].order = visualIdx
				})
			}
		}

		if (Object.keys(itemOverrides).length === 0) {
			const defaultVisual = getVisualOrder(activeItems, it => DEFAULT_ITEMS.find(d => d.id === it.id)?.order ?? 0)
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

	const startNewQuiz = () => {
		if (quizHistory.length >= quizQuestionCount) return

		setContainerStyles({ ...DEFAULT_CONTAINER_STYLES })
		setItems(DEFAULT_ITEMS.map(item => ({ ...item })))
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
		startNewQuiz()
	}

	const skipToNext = () => startNewQuiz()
	const goBack = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setShowSuccess(false); setCountdown(0); } }
	const goForward = () => { if (historyIndex < quizHistory.length - 1) { setHistoryIndex(historyIndex + 1); setShowSuccess(false); setCountdown(0); } }

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

		const directionMatches = containerStyles.flexDirection === quizTarget.flexDirection
		const justifyMatches = containerStyles.justifyContent === quizTarget.justifyContent

		if (containerStyles.gap !== quizTarget.gap && directionMatches && justifyMatches) keys.add('gap')

		const activeItems = items.slice(0, itemCount)

		const userVisualOrder = getVisualOrder(activeItems, it => it.order)
		const targetVisualOrder = getVisualOrder(activeItems, it => {
			const defaultItem = DEFAULT_ITEMS.find(d => d.id === it.id) || it
			return (quizTarget.itemOverrides?.[it.id]?.order) ?? defaultItem.order
		})
		const orderMatters = userVisualOrder.some((id, i) => id !== targetVisualOrder[i])

		activeItems.forEach(item => {
			const defaultItem = DEFAULT_ITEMS.find(it => it.id === item.id) || item
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
		if (!isQuizMode) setShowQuizOptions(false)
	}, [isQuizMode])

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
		const checkMatch = () => {
			if (!realContainerRef.current || !ghostContainerRef.current) return
			const realItems = Array.from(realContainerRef.current.children)
			const ghostItems = Array.from(ghostContainerRef.current.children)
			if (realItems.length !== ghostItems.length) return
			const isVisualMatch = realItems.every((real, index) => {
				const ghost = ghostItems[index]
				const rRect = real.getBoundingClientRect()
				const gRect = ghost.getBoundingClientRect()
				return Math.abs(rRect.left - gRect.left) <= 2 && Math.abs(rRect.top - gRect.top) <= 2 && Math.abs(rRect.width - gRect.width) <= 2 && Math.abs(rRect.height - gRect.height) <= 2
			})
			if (isVisualMatch) {
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
		}
		const timer = setTimeout(checkMatch, 450)
		return () => clearTimeout(timer)
	}, [containerStyles, items, quizHistory, historyIndex, isQuizMode, itemCount, showSuccess, quizQuestionCount])

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

	return (
		<div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 font-sans">
			<header className="max-w-7xl mx-auto mb-6 flex flex-row flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">Flexbox Playground</h1>
					<p className="text-slate-500 text-sm">Visualizing CSS Flexbox with real-time feedback.</p>
				</div>

				<div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
					<button
						onClick={() => { setIsQuizMode(false); setQuizHistory([]); setHistoryIndex(-1); setScore(0) }}
						className={`flex items-center gap-2 px-4 py-2.5 md:px-6 rounded-lg font-bold text-sm transition-all ${!isQuizMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
						title="Playground"
						aria-label="Playground"
					>
						<Gamepad2 size={16} />
						<span className="hidden md:inline">Playground</span>
					</button>
					<button
						onClick={() => { setIsQuizMode(true); setShowQuizOptions(true) }}
						className={`flex items-center gap-2 px-4 py-2.5 md:px-6 rounded-lg font-bold text-sm transition-all ${isQuizMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
						title="Quiz Mode"
						aria-label="Quiz Mode"
					>
						<GraduationCap size={18} />
						<span className="hidden md:inline">Quiz Mode</span>
					</button>
				</div>
			</header>

			<main className="max-w-7xl mx-auto space-y-4">
				<div className="relative aspect-[21/8] flex flex-col w-full bg-slate-200 rounded-[2rem] overflow-hidden shadow-inner border-[10px] border-white">
					<div className="bg-white/60 backdrop-blur-md border-b border-white px-6 py-2 flex items-center justify-between min-h-[56px] z-30">
						<div className="flex items-center gap-2">
							{/* Box Count Chooser */}
							<div className="flex items-center bg-white/80 rounded-xl p-1 border border-white/50 shadow-sm h-[38px] box-border">
								<div className="flex items-center gap-2 px-2">
									<button onClick={() => setItemCount(Math.max(1, itemCount - 1))} className="p-1 bg-white rounded-lg shadow-sm hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-slate-600"><Minus size={12}/></button>
									<span className="text-sm font-bold w-4 text-center">{itemCount}</span>
									<button onClick={() => setItemCount(Math.min(5, itemCount + 1))} className="p-1 bg-white rounded-lg shadow-sm hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-slate-600"><Plus size={12}/></button>
									<span className="text-[9px] font-bold uppercase text-slate-400 ml-1">Boxes</span>
								</div>
							</div>
							{/* Axis Toggle - separate icon */}
							<button
								onClick={() => setShowAxes(!showAxes)}
								className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${showAxes ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white/80 border-white/50 text-slate-400 hover:bg-white hover:text-slate-600'}`}
								title="Toggle Axes Overlay"
								aria-label={showAxes ? 'Hide axes overlay' : 'Show axes overlay'}
							>
								<Axis3d size={18} strokeWidth={2.5} />
							</button>
							{/* Reset container and items to defaults */}
							<button
								type="button"
								onClick={resetAllToDefaults}
								className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/50 bg-white/80 shadow-sm text-slate-400 hover:bg-white hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-all"
								title="Reset container and items to defaults"
								aria-label="Reset container and all items to default values"
							>
								<Undo2 size={18} strokeWidth={2.5} />
							</button>
							{isQuizMode && (
								<button
									type="button"
									onClick={() => setShowQuizOptions(true)}
									className="flex items-center bg-white/80 rounded-xl px-3 border border-white/50 shadow-sm h-[38px] box-border text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
									title="Restart quiz"
									aria-label="Restart quiz"
								>
									<Undo2 size={14} className="mr-1.5" />
									<span className="hidden sm:inline">Restart Quiz</span>
								</button>
							)}
						</div>

						{isQuizMode && (
							<>
								<div className="flex-grow flex justify-center px-4">
									{quizCompleted ? (
										<div className="relative flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300 w-full max-w-md bg-white/80 rounded-xl border border-emerald-100 shadow-lg px-4 py-2.5 overflow-hidden">
											<div className="pointer-events-none absolute inset-0">
												<span className="absolute -top-1 left-6 w-1.5 h-3 bg-pink-400 rounded-sm rotate-12" />
												<span className="absolute top-3 right-4 w-1.5 h-3 bg-sky-400 rounded-sm -rotate-6" />
												<span className="absolute bottom-1 left-10 w-1 h-2 bg-amber-400 rounded-sm rotate-3" />
												<span className="absolute top-1/2 left-1/3 w-1.5 h-3 bg-violet-400 rounded-sm -rotate-12" />
												<span className="absolute bottom-2 right-8 w-1 h-2 bg-emerald-400 rounded-sm rotate-8" />
												<span className="absolute top-0 right-1/3 w-1 h-2 bg-rose-400 rounded-sm rotate-6" />
											</div>
											<div className="relative flex items-center gap-2.5">
												<PartyPopper className="text-emerald-500" size={18} />
												<div className="flex flex-col">
													<span className="text-emerald-700 font-extrabold text-xs uppercase tracking-tight">Quiz complete!</span>
													<span className="text-[11px] text-slate-600">Nice work matching all layouts.</span>
												</div>
											</div>
											<div className="relative flex flex-col items-end gap-0.5">
												<span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Score</span>
												<span className="text-sm font-black text-emerald-600">
													{score} / {quizQuestionCount}
												</span>
											</div>
										</div>
									) : showSuccess ? (
										<div className="flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 w-full max-w-sm">
											<div className="flex items-center gap-2.5 shrink-0">
												<PartyPopper className="text-emerald-500" size={16} />
												<span className="text-emerald-700 font-extrabold text-xs uppercase tracking-tight">Match!</span>
											</div>
											<div className="flex-grow flex items-center gap-2">
												<div className="flex-grow h-1 bg-emerald-100/50 rounded-full overflow-hidden">
													<div className="h-full bg-emerald-500 transition-all duration-75 ease-linear" style={{ width: `${countdown}%` }} />
												</div>
												<span className="text-[9px] font-mono font-bold text-emerald-600">{(Math.max(0, (QUIZ_DELAY_MS - (countdown * QUIZ_DELAY_MS / 100)) / 1000)).toFixed(1)}s</span>
											</div>
											<div className="flex items-center gap-1">
												<button onClick={() => setIsPaused(!isPaused)} className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors">
													{isPaused ? <Play size={12} /> : <Pause size={12} />}
												</button>
												<button onClick={skipToNext} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg text-[9px] font-bold shadow-md">Next</button>
											</div>
											<div className="w-px h-3 bg-slate-300 mx-0.5" />
											<button
												onClick={() => setOutlineOnly(!outlineOnly)}
												aria-pressed={outlineOnly}
												aria-label={outlineOnly ? 'Show filled boxes' : 'Show outline only'}
												className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase transition-all border ${outlineOnly ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
											>
												<Box size={12} />
												Outline
											</button>
										</div>
									) : (
										<div className="flex items-center gap-2 bg-white/40 p-0.5 rounded-xl border border-white/30">
											<div className="flex items-center gap-0.5">
												<button onClick={goBack} disabled={historyIndex <= 0} className="p-1.5 hover:bg-white disabled:opacity-30 rounded-lg transition-all text-slate-600" title="Back"><ChevronLeft size={14} /></button>
												<span className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 min-w-[4rem] text-center" aria-live="polite">
													{historyIndex < 0 ? '—' : historyIndex + 1} / {quizQuestionCount}
												</span>
												<button onClick={goForward} disabled={historyIndex >= quizHistory.length - 1} className="p-1.5 hover:bg-white disabled:opacity-30 rounded-lg transition-all text-slate-600"><ChevronRight size={14} /></button>
											</div>
											<div className="w-px h-3 bg-slate-300 mx-0.5" />
											<button onClick={handleHintClick} className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[9px] uppercase transition-all border ${showHint ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
												{showHint ? <Eye size={12} /> : <EyeOff size={12} />} Hint
											</button>
											{showSolution && (
												<>
													<div className="w-px h-3 bg-slate-300 mx-0.5" />
													<button onClick={skipToNext} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg text-[9px] font-bold shadow-md">Next</button>
												</>
											)}
											<div className="w-px h-3 bg-slate-300 mx-0.5" />
											<button
												onClick={() => setOutlineOnly(!outlineOnly)}
												aria-pressed={outlineOnly}
												aria-label={outlineOnly ? 'Show filled boxes' : 'Show outline only'}
												className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase transition-all border ${outlineOnly ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
											>
												<Box size={12} />
												Outline
											</button>
										</div>
									)}
								</div>

								<div className="flex items-center min-w-[120px] justify-end">
									<div className="flex items-center gap-1.5 px-3 h-[38px] box-border bg-amber-50 text-amber-700 rounded-xl border border-amber-100 shadow-sm">
										<Award size={12} />
										<span className="text-[10px] font-black tracking-tight">{score} Pts</span>
									</div>
								</div>
							</>
						)}
						{!isQuizMode && <div className="min-w-[120px]" />}
					</div>

					<div className="flex-grow relative bg-slate-200">
						{/* AXES OVERLAY */}
						{showAxes && (
							<div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
								<div className={`absolute border-slate-400/30 border-dashed transition-all duration-500 ${isVerticalFlow ? 'left-1/2 top-0 bottom-0 border-l-2 -translate-x-1/2' : 'top-1/2 left-0 right-0 border-t-2 -translate-y-1/2'}`}>
									<div className={`absolute transition-all duration-500 text-slate-400/40 flex items-center justify-center ${
										isVerticalFlow
											? (isReverse ? 'top-0 left-0 -translate-x-1/2 rotate-180' : 'bottom-0 left-0 -translate-x-1/2')
											: (isReverse ? 'left-0 top-0 -translate-y-1/2 rotate-180' : 'right-0 top-0 -translate-y-1/2')
									}`}>
										{isVerticalFlow ? <ArrowDown size={14} strokeWidth={4} /> : <ArrowRight size={14} strokeWidth={4} />}
									</div>
									<div className={`absolute text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400/40 transition-all duration-500 whitespace-nowrap ${
										isVerticalFlow
											? 'left-0 top-1/4 -translate-x-[110%] -rotate-90 origin-right'
											: 'top-0 left-1/4 -translate-y-full -translate-x-1/2 pb-1'
									}`}>
										Main Axis
									</div>
								</div>

								<div className={`absolute border-slate-400/30 border-dashed transition-all duration-500 ${isVerticalFlow ? 'top-1/2 left-0 right-0 border-t-2 -translate-y-1/2' : 'left-1/2 top-0 bottom-0 border-l-2 -translate-x-1/2'}`}>
									<div className={`absolute transition-all duration-500 text-slate-400/40 flex items-center justify-center ${
										isVerticalFlow ? 'right-0 top-0 -translate-y-1/2' : 'bottom-0 left-0 -translate-x-1/2'
									}`}>
										{isVerticalFlow ? <ArrowRight size={14} strokeWidth={4} /> : <ArrowDown size={14} strokeWidth={4} />}
									</div>
									<div className={`absolute text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400/40 transition-all duration-500 whitespace-nowrap ${
										isVerticalFlow
											? 'top-0 left-1/4 -translate-y-full -translate-x-1/2 pb-1'
											: 'left-0 top-1/4 -translate-x-[110%] -rotate-90 origin-right'
									}`}>
										Cross Axis
									</div>
								</div>
							</div>
						)}

						{/* QUIZ GHOSTS — use only target overrides + defaults so ghost doesn't follow user's edits */}
						{isQuizMode && quizTarget && (
							<div ref={ghostContainerRef} className="absolute inset-0 pointer-events-none opacity-20 transition-flex z-0" style={{ display: 'flex', flexDirection: quizTarget.flexDirection, justifyContent: quizTarget.justifyContent, alignItems: quizTarget.alignItems, gap: quizTarget.gap, padding: '30px', boxSizing: 'border-box' }}>
								{items.slice(0, itemCount).map((item, idx) => {
									const defaultItem = DEFAULT_ITEMS[idx] || item
									const overrides = quizTarget.itemOverrides?.[item.id] || {}
									return (
										<div key={`target-${item.id}`} className="flex items-center justify-center" style={{ width: item.width, height: item.height, backgroundColor: '#475569', borderRadius: '16px', outline: '2px dashed #1e293b', outlineOffset: '-2px', boxSizing: 'border-box', order: overrides.order ?? defaultItem.order, alignSelf: overrides.alignSelf ?? defaultItem.alignSelf, flexGrow: overrides.flexGrow ?? defaultItem.flexGrow, flexShrink: overrides.flexShrink ?? defaultItem.flexShrink }}>
											<span className="font-bold text-2xl opacity-0">{item.id}</span>
										</div>
									)
								})}
							</div>
						)}

						{/* REAL ITEMS */}
						<div ref={realContainerRef} className="absolute inset-0 transition-flex z-20" style={{ display: containerStyles.display, flexDirection: containerStyles.flexDirection, justifyContent: containerStyles.justifyContent, alignItems: containerStyles.alignItems, gap: containerStyles.gap, padding: '30px', boxSizing: 'border-box' }} onClick={() => { setActiveTab('properties'); setSelectedId(0) }}>
							{items.slice(0, itemCount).map((item) => {
								const itemColor = `hsl(${item.id * 50 + 200}, 70%, 60%)`
								const isOutline = outlineOnly
								return (
									<div
										key={item.id}
										onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); setActiveTab('items') }}
										className={`relative flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl ${selectedId === item.id ? 'z-10' : ''}`}
										style={{
											width: item.width,
											height: item.height,
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
						<button onClick={() => setActiveTab('properties')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-6 rounded-xl font-bold text-sm transition-all ${activeTab === 'properties' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>
							<SlidersHorizontal size={14} />Container
						</button>
						<div className={`flex-1 relative flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === 'items' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => { if (selectedId === 0) setSelectedId(1); setActiveTab('items') }}>
							<button onClick={handlePrevItem} disabled={selectedId <= 1} className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all text-slate-400"><ChevronLeft size={14}/></button>
							<div className="flex items-center gap-2 font-bold text-sm select-none"><Box size={14} /><span>Item {selectedId > 0 ? selectedId : 1}</span></div>
							<button onClick={handleNextItem} disabled={selectedId >= itemCount} className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all text-slate-400"><ChevronRight size={14}/></button>
						</div>
						<button onClick={() => setActiveTab('code')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-6 rounded-xl font-bold text-sm transition-all ${activeTab === 'code' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>
							<FileCode size={14} />Code Editor
						</button>
					</div>

					<div className="p-5 min-h-[280px]">
						{activeTab === 'properties' && (
							<div className="animate-in fade-in duration-300">
								<div className="flex flex-col gap-4">
									<div className="flex flex-wrap items-end gap-8">
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
														<Undo2 size={12} strokeWidth={2.5} />
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
															<Undo2 size={12} strokeWidth={2.5} />
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
										onChange={e => { setQuizQuestionCount(parseInt(e.target.value, 10) || 4); if (quizDifficulty !== 'custom') setQuizDifficulty('custom') }}
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
          transition-property: flex-direction, justify-content, align-items, gap, opacity;
          transition-duration: 300ms;
          transition-timing-function: ease;
        }
      `}</style>
		</div>
	)
}

export default App
