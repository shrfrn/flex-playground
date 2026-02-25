import React, { useState, useEffect, useRef } from 'react'
import {
	Settings, Play, CheckCircle, Code, Plus, Minus,
	RotateCcw, Award, PartyPopper, Eye, EyeOff, Layout as LayoutIcon,
	ChevronLeft, ChevronRight, Pause, PlayCircle, SkipForward,
	SlidersHorizontal, FileCode, Box, GraduationCap, Gamepad2,
	ArrowRight, ArrowDown, Axis3d,
} from 'lucide-react'

const App = () => {
	// --- State Definitions ---
	const [activeTab, setActiveTab] = useState('properties') // 'properties' | 'code' | 'items'
	const [itemCount, setItemCount] = useState(3)
	const [selectedId, setSelectedId] = useState(1)
	const [isQuizMode, setIsQuizMode] = useState(false)
	const [showHint, setShowHint] = useState(false)
	const [score, setScore] = useState(0)
	const [itemOpacity, setItemOpacity] = useState(1)
	const [showAxes, setShowAxes] = useState(true) // Toggle for axis visibility

	// Quiz History Management
	const [quizHistory, setQuizHistory] = useState([])
	const [historyIndex, setHistoryIndex] = useState(-1)
	const [isPaused, setIsPaused] = useState(false)
	const [countdown, setCountdown] = useState(0)
	const [showSuccess, setShowSuccess] = useState(false)

	const QUIZ_DELAY_MS = 3000

	// Container Styles
	const [containerStyles, setContainerStyles] = useState({
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'start',
		alignItems: 'stretch',
		gap: '10px',
	})

	// Individual Item Styles
	const [items, setItems] = useState([
		{ id: 1, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, width: '60px', height: '60px' },
		{ id: 2, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, width: '80px', height: '50px' },
		{ id: 3, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, width: '50px', height: '80px' },
		{ id: 4, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, width: '70px', height: '40px' },
		{ id: 5, alignSelf: 'auto', flexGrow: 0, flexShrink: 1, width: '90px', height: '70px' },
	])

	const [cssCode, setCssCode] = useState('')
	const realContainerRef = useRef(null)
	const ghostContainerRef = useRef(null)

	const flexValues = {
		flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
		justifyContent: ['start', 'end', 'center', 'space-between', 'space-around', 'space-evenly'],
		alignItems: ['stretch', 'start', 'end', 'center', 'baseline'],
		alignSelf: ['auto', 'start', 'end', 'center', 'baseline', 'stretch'],
	}

	const generateCss = () => {
		let css = `.container {\n  display: ${containerStyles.display};\n`
		if (containerStyles.display === 'flex') {
			const getVal = (v) => (v === 'start' ? 'flex-start' : v === 'end' ? 'flex-end' : v)
			css += `  flex-direction: ${containerStyles.flexDirection};\n`
			css += `  justify-content: ${getVal(containerStyles.justifyContent)};\n`
			css += `  align-items: ${getVal(containerStyles.alignItems)};\n`
			css += `  gap: ${containerStyles.gap};\n`
		}
		css += `}\n\n`

		items.slice(0, itemCount).forEach((item, idx) => {
			const hasOverrides = item.alignSelf !== 'auto' || item.flexGrow !== 0 || item.flexShrink !== 1
			if (hasOverrides) {
				css += `.item-${idx + 1} {\n`
				if (item.alignSelf !== 'auto') {
					const val = item.alignSelf === 'start' ? 'flex-start' : item.alignSelf === 'end' ? 'flex-end' : item.alignSelf
					css += `  align-self: ${val};\n`
				}
				if (item.flexGrow !== 0) css += `  flex-grow: ${item.flexGrow};\n`
				if (item.flexShrink !== 1) css += `  flex-shrink: ${item.flexShrink};\n`
				css += `}\n\n`
			}
		})
		return css.trim()
	}

	useEffect(() => {
		setCssCode(generateCss())
	}, [containerStyles, items, itemCount])

	const handleCssEdit = (e) => {
		const val = e.target.value
		setCssCode(val)
		const newContainer = { ...containerStyles }
		const displayMatch = val.match(/display:\s*(block|flex)/)
		if (displayMatch) newContainer.display = displayMatch[1]
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

	const startNewQuiz = () => {
		const randomStyles = {
			flexDirection: flexValues.flexDirection[Math.floor(Math.random() * flexValues.flexDirection.length)],
			justifyContent: flexValues.justifyContent[Math.floor(Math.random() * flexValues.justifyContent.length)],
			alignItems: flexValues.alignItems[Math.floor(Math.random() * flexValues.alignItems.length)],
			gap: `${Math.floor(Math.random() * 5) * 5}px`,
		}
		setQuizHistory((prev) => [...prev, randomStyles])
		setHistoryIndex((prev) => prev + 1)
		setCountdown(0)
		setShowSuccess(false)
	}

	const skipToNext = () => startNewQuiz()
	const goBack = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setShowSuccess(false); setCountdown(0); } }
	const goForward = () => { if (historyIndex < quizHistory.length - 1) { setHistoryIndex(historyIndex + 1); setShowSuccess(false); setCountdown(0); } }

	useEffect(() => {
		if (isQuizMode && quizHistory.length === 0) startNewQuiz()
	}, [isQuizMode])

	useEffect(() => {
		let interval
		if (showSuccess && !isPaused && countdown < 100) {
			interval = setInterval(() => {
				setCountdown((prev) => {
					const next = prev + (100 / (QUIZ_DELAY_MS / 50))
					if (next >= 100) { clearInterval(interval); startNewQuiz(); return 100 }
					return next
				})
			}, 50)
		}
		return () => clearInterval(interval)
	}, [showSuccess, isPaused, countdown])

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
			if (isVisualMatch) { setScore((s) => s + 1); setShowSuccess(true); setCountdown(0) }
		}
		const timer = setTimeout(checkMatch, 450)
		return () => clearTimeout(timer)
	}, [containerStyles, quizHistory, historyIndex, isQuizMode, itemCount, showSuccess])

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
			<header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">Flexbox Playground</h1>
					<p className="text-slate-500 text-sm">Visualizing CSS Flexbox with real-time feedback.</p>
				</div>

				<div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
					<button
						onClick={() => { setIsQuizMode(false); setQuizHistory([]); setHistoryIndex(-1); setScore(0) }}
						className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${!isQuizMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
					>
						<Gamepad2 size={16} />
						Playground
					</button>
					<button
						onClick={() => { setIsQuizMode(true); if (quizHistory.length === 0) startNewQuiz() }}
						className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${isQuizMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
					>
						<GraduationCap size={18} />
						Quiz Mode
					</button>
				</div>
			</header>

			<main className="max-w-7xl mx-auto space-y-4">
				<div className="relative aspect-[21/8] flex flex-col w-full bg-slate-200 rounded-[2rem] overflow-hidden shadow-inner border-[10px] border-white">
					<div className="bg-white/60 backdrop-blur-md border-b border-white px-6 py-2 flex items-center justify-between min-h-[56px] z-30">
						<div className="flex items-center">
							{/* Box Count & Axis Unified Chooser */}
							<div className="flex items-center bg-white/80 rounded-xl p-1 border border-white/50 shadow-sm h-[38px] box-border">
								<div className="flex items-center gap-2 px-2">
									<button onClick={() => setItemCount(Math.max(1, itemCount - 1))} className="p-1 bg-white rounded-lg shadow-sm hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-slate-600"><Minus size={12}/></button>
									<span className="text-sm font-bold w-4 text-center">{itemCount}</span>
									<button onClick={() => setItemCount(Math.min(5, itemCount + 1))} className="p-1 bg-white rounded-lg shadow-sm hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-slate-600"><Plus size={12}/></button>
									<span className="text-[9px] font-bold uppercase text-slate-400 ml-1">Boxes</span>
								</div>

								{/* Visual Divider */}
								<div className="w-px h-4 bg-slate-200 mx-1" />

								<button
									onClick={() => setShowAxes(!showAxes)}
									className={`flex items-center justify-center px-2.5 h-full rounded-lg transition-all ${showAxes ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
									title="Toggle Axes Overlay"
								>
									<Axis3d size={18} strokeWidth={2.5} />
								</button>
							</div>
						</div>

						{isQuizMode && (
							<>
								<div className="flex-grow flex justify-center px-4">
									{showSuccess ? (
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
										</div>
									) : (
										<div className="flex items-center gap-2 bg-white/40 p-0.5 rounded-xl border border-white/30">
											<div className="flex items-center gap-0.5">
												<button onClick={goBack} disabled={historyIndex <= 0} className="p-1.5 hover:bg-white disabled:opacity-30 rounded-lg transition-all text-slate-600" title="Back"><ChevronLeft size={14} /></button>
												<button onClick={() => setIsPaused(!isPaused)} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600">{isPaused ? <PlayCircle size={14} /> : <Pause size={14} />}</button>
												<button onClick={goForward} disabled={historyIndex >= quizHistory.length - 1} className="p-1.5 hover:bg-white disabled:opacity-30 rounded-lg transition-all text-slate-600"><ChevronRight size={14} /></button>
											</div>
											<div className="w-px h-3 bg-slate-300 mx-0.5" />
											<button onClick={() => setShowHint(!showHint)} className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[9px] uppercase transition-all border ${showHint ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
												{showHint ? <Eye size={12} /> : <EyeOff size={12} />} Hint
											</button>
										</div>
									)}
								</div>

								<div className="flex items-center gap-4 min-w-[240px] justify-end">
									<div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 shadow-sm">
										<Award size={12} />
										<span className="text-[10px] font-black tracking-tight">{score} Pts</span>
									</div>

									<div className="flex flex-col items-end gap-0.5">
										<span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Vis {Math.round(itemOpacity * 100)}%</span>
										<div className="flex items-center gap-2">
											<input type="range" min="0.1" max="1" step="0.1" value={itemOpacity} onChange={(e) => setItemOpacity(parseFloat(e.target.value))} className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
										</div>
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

						{/* QUIZ GHOSTS */}
						{isQuizMode && quizTarget && (
							<div ref={ghostContainerRef} className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-300 z-0" style={{ display: 'flex', flexDirection: quizTarget.flexDirection, justifyContent: quizTarget.justifyContent, alignItems: quizTarget.alignItems, gap: quizTarget.gap, padding: '30px', boxSizing: 'border-box' }}>
								{items.slice(0, itemCount).map((item) => (
									<div key={`target-${item.id}`} className="flex items-center justify-center" style={{ width: item.width, height: item.height, backgroundColor: '#1e293b', borderRadius: '16px', outline: '3px dashed #000', outlineOffset: '-2px', boxSizing: 'border-box' }}>
										<span className="font-bold text-2xl opacity-0">{item.id}</span>
									</div>
								))}
							</div>
						)}

						{/* REAL ITEMS */}
						<div ref={realContainerRef} className="absolute inset-0 transition-all duration-300 z-20" style={{ display: containerStyles.display, flexDirection: containerStyles.flexDirection, justifyContent: containerStyles.justifyContent, alignItems: containerStyles.alignItems, gap: containerStyles.gap, padding: '30px', boxSizing: 'border-box' }} onClick={() => { setActiveTab('properties'); setSelectedId(0) }}>
							{items.slice(0, itemCount).map((item) => (
								<div key={item.id} onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); setActiveTab('items') }} className={`relative flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl ${selectedId === item.id ? 'ring-[4px] ring-blue-500 z-10' : 'hover:ring-2 hover:ring-blue-300'}`} style={{ width: item.width, height: item.height, backgroundColor: `hsl(${item.id * 50 + 200}, 70%, 60%)`, opacity: itemOpacity, color: 'white', borderRadius: '16px', alignSelf: item.alignSelf, flexGrow: item.flexGrow, flexShrink: item.flexShrink, boxSizing: 'border-box' }}>
									<span className="font-bold text-xl drop-shadow-sm">{item.id}</span>
								</div>
							))}
						</div>

						{/* QUIZ HUD */}
						{isQuizMode && showHint && quizTarget && (
							<div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none animate-in fade-in slide-in-from-top-4 z-40">
								<div className="bg-black/80 text-white px-5 py-2 rounded-full text-[10px] font-mono backdrop-blur-md border border-white/20 shadow-2xl flex items-center gap-3">
									<span className="font-bold uppercase tracking-widest text-[9px] text-pink-400">CHALLENGE #{historyIndex + 1}</span>
									<div className="w-px h-3 bg-white/20" />
									<div className="flex gap-3 text-[9px]">
										<span>DIR: <b className="text-pink-400">{quizTarget.flexDirection}</b></span>
										<span>JUSTIFY: <b className="text-emerald-400">{quizTarget.justifyContent}</b></span>
										<span>ALIGN: <b className="text-sky-400">{quizTarget.alignItems}</b></span>
										<span>GAP: <b className="text-amber-400">{quizTarget.gap}</b></span>
									</div>
								</div>
							</div>
						)}
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

								<div className="flex flex-wrap items-end gap-x-8 gap-y-4">
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
									</div>
								</div>
							</div>
						)}

						{activeTab === 'code' && (
							<div className="bg-slate-900 rounded-[1rem] overflow-hidden flex flex-col min-h-[280px] animate-in fade-in duration-300">
								<div className="flex items-center justify-between px-6 py-3 bg-slate-800/80 border-b border-slate-800">
									<span className="text-slate-400 text-xs font-mono flex items-center gap-2"><FileCode size={14} /> styles.css</span>
									<button onClick={() => setCssCode(generateCss())} className="text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-slate-700 rounded-lg"><RotateCcw size={16} /></button>
								</div>
								<textarea value={cssCode} onChange={handleCssEdit} spellCheck="false" className="flex-grow w-full p-6 bg-transparent text-emerald-400 font-mono text-base resize-none outline-none leading-relaxed" />
							</div>
						)}
					</div>
				</div>
			</main>

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
      `}</style>
		</div>
	)
}

export default App
