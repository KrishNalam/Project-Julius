import { useMemo, useRef, useState } from 'react'
import {
    CalendarPlus,
    FileText,
    Flag,
    Loader2,
    Trash2,
    Upload,
} from 'lucide-react'
import { apiFetch } from '../../api'
import { formatDueDate } from '../../utils/date'
import './Documents.scss'

const ACCEPTED = '.pdf,.docx,.txt,.md,.csv,.log'

const Documents = ({
    events,
    onAddEvents,
    onDeleteEvent,
    onDeleteDocument,
    onToggleEventFlag,
}) => {
    const [parsing, setParsing] = useState(false)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null) // { filename, dates }
    const [selected, setSelected] = useState(new Set())
    const [flagged, setFlagged] = useState(new Set())
    const [dragging, setDragging] = useState(false)
    const fileInputRef = useRef(null)

    // Imported events grouped by source document
    const documents = useMemo(() => {
        const map = {}
        for (const event of events) {
            ;(map[event.source ?? 'Unknown'] ??= []).push(event)
        }
        return map
    }, [events])

    const parseFile = async (file) => {
        if (!file) return
        setParsing(true)
        setError(null)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('document', file)

            const data = await apiFetch('/api/documents/parse', {
                method: 'POST',
                formData,
            })

            setResult(data)
            setSelected(new Set(data.dates.map((_, i) => i)))
            setFlagged(new Set())
        } catch (err) {
            setError(
                err.message === 'Failed to fetch'
                    ? 'Could not reach the backend. Is it running? (npm run dev in backend/)'
                    : err.message
            )
        } finally {
            setParsing(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        parseFile(e.dataTransfer.files[0])
    }

    const toggleSelected = (index) => {
        const next = new Set(selected)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        setSelected(next)
    }

    const toggleFlagged = (index) => {
        const next = new Set(flagged)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        setFlagged(next)
    }

    const importSelected = async () => {
        const newEvents = result.dates
            .map((d, i) => ({
                title: d.matchedText,
                context: d.context,
                dueDate: d.dateKey,
                source: result.filename,
                needsPrep: flagged.has(i),
                index: i,
            }))
            .filter((e) => selected.has(e.index))
        try {
            await onAddEvents(newEvents)
            setResult(null)
            setSelected(new Set())
            setFlagged(new Set())
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="documents-page">
            <div className="upload-section card">
                <h2 className="section-title">Import Dates from a Document</h2>
                <p className="upload-hint">
                    Upload a PDF, Word doc, or text file — every date found in
                    it can be added to your calendar.
                </p>

                <div
                    className={`dropzone ${dragging ? 'dragging' : ''}`}
                    onDragOver={(e) => {
                        e.preventDefault()
                        setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {parsing ? (
                        <>
                            <Loader2 size={32} className="spin" />
                            <p>Parsing document…</p>
                        </>
                    ) : (
                        <>
                            <Upload size={32} />
                            <p>
                                Drag &amp; drop a file here, or{' '}
                                <span className="browse">browse</span>
                            </p>
                            <span className="file-types">
                                PDF, DOCX, TXT, MD, CSV
                            </span>
                        </>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED}
                        hidden
                        onChange={(e) => {
                            parseFile(e.target.files[0])
                            e.target.value = ''
                        }}
                    />
                </div>

                {error && <p className="error-msg">{error}</p>}

                {result && (
                    <div className="parse-result">
                        <h3 className="result-title">
                            <FileText size={16} />
                            {result.filename} —{' '}
                            {result.dates.length === 0
                                ? 'no dates found'
                                : `${result.dates.length} date${
                                      result.dates.length === 1 ? '' : 's'
                                  } found`}
                        </h3>

                        {result.dates.length > 0 && (
                            <>
                                <div className="found-dates">
                                    {result.dates.map((d, i) => (
                                        <label
                                            key={i}
                                            className="found-date"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.has(i)}
                                                onChange={() =>
                                                    toggleSelected(i)
                                                }
                                            />
                                            <div className="found-date-info">
                                                <span className="found-date-day">
                                                    {formatDueDate(d.dateKey)}
                                                </span>
                                                <span className="found-date-context">
                                                    {d.context}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className={`task-btn flag-btn ${
                                                    flagged.has(i)
                                                        ? 'flagged'
                                                        : ''
                                                }`}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    toggleFlagged(i)
                                                }}
                                                title={
                                                    flagged.has(i)
                                                        ? 'Flagged — prep time will be scheduled'
                                                        : 'Flag for prep time'
                                                }
                                            >
                                                <Flag size={16} />
                                            </button>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    className="import-btn"
                                    disabled={selected.size === 0}
                                    onClick={importSelected}
                                >
                                    <CalendarPlus size={18} />
                                    Add {selected.size} to calendar
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="imported-section card">
                <h2 className="section-title">Imported Documents</h2>

                {Object.keys(documents).length === 0 ? (
                    <p className="empty-msg">
                        Nothing imported yet. Dates you add will show up on the
                        calendar.
                    </p>
                ) : (
                    Object.entries(documents).map(([source, docEvents]) => (
                        <div key={source} className="document-group">
                            <div className="document-header">
                                <span className="document-name">
                                    <FileText size={16} />
                                    {source}
                                </span>
                                <button
                                    className="task-btn delete-btn"
                                    onClick={() => onDeleteDocument(source)}
                                    title="Remove all dates from this document"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="document-events">
                                {docEvents.map((event) => (
                                    <div key={event.id} className="doc-event">
                                        <div className="doc-event-info">
                                            <span className="doc-event-date">
                                                {formatDueDate(event.dueDate)}
                                            </span>
                                            <span
                                                className="doc-event-context"
                                                title={event.context}
                                            >
                                                {event.context}
                                            </span>
                                        </div>
                                        <button
                                            className={`task-btn flag-btn ${
                                                event.needsPrep ? 'flagged' : ''
                                            }`}
                                            onClick={() =>
                                                onToggleEventFlag(event)
                                            }
                                            title={
                                                event.needsPrep
                                                    ? 'Flagged — prep time scheduled'
                                                    : 'Flag for prep time'
                                            }
                                        >
                                            <Flag size={14} />
                                        </button>
                                        <button
                                            className="task-btn delete-btn"
                                            onClick={() =>
                                                onDeleteEvent(event.id)
                                            }
                                            title="Remove from calendar"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default Documents
