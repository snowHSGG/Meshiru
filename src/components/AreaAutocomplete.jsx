import { useState, useRef, useEffect } from 'react'
import { fetchAutocompleteSuggestions, fetchPlaceLocation } from '../api/places'

export default function AreaAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(e) {
    const text = e.target.value
    onChange(text)
    onSelect(null)
    clearTimeout(debounceRef.current)
    if (!text.trim()) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const results = await fetchAutocompleteSuggestions(text)
      setSuggestions(results)
      setOpen(results.length > 0)
    }, 300)
  }

  async function handleSelect(s) {
    onChange(s.mainText)
    setOpen(false)
    setSuggestions([])
    const location = await fetchPlaceLocation(s.placeId)
    if (location) onSelect({ label: s.mainText, lat: location.latitude, lng: location.longitude })
  }

  return (
    <div className="area-autocomplete" ref={containerRef}>
      <input
        className="area-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && (
        <ul className="area-suggestions">
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              className="area-suggestion-item"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
            >
              <span className="area-suggestion-main">{s.mainText}</span>
              {s.secondaryText && <span className="area-suggestion-sub">{s.secondaryText}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
