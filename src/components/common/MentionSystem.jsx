import { useState, useEffect, useRef } from 'react';
import { SearchService } from '../../services/SearchService';

const MentionSystem = ({ onMention, onSelect }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const suggestionRef = useRef(null);

  useEffect(() => {
    if (query.length >= 1) {
      loadSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleClickOutside = (event) => {
    if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
      setShowSuggestions(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const results = await SearchService.getMentionSuggestions(query);
      setSuggestions(results);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error loading mention suggestions:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleSelect = (suggestion) => {
    onSelect(suggestion);
    setShowSuggestions(false);
    setQuery('');
  };

  const handleMentionTrigger = (element, triggerChar) => {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    setPosition({
      top: rect.bottom + scrollTop,
      left: rect.left + scrollLeft
    });

    setQuery('');
    setShowSuggestions(true);
    onMention(triggerChar);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'user':
        return '👤';
      case 'page':
        return '📄';
      case 'group':
        return '👥';
      default:
        return '🔍';
    }
  };

  return (
    <>
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionRef}
          className="absolute z-50 bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto"
          style={{
            top: position.top + 'px',
            left: position.left + 'px',
            minWidth: '200px'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`flex items-center p-2 cursor-pointer ${
                index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="mr-2">{getTypeIcon(suggestion.type)}</span>
              <div>
                <div className="font-medium">{suggestion.displayName}</div>
                <div className="text-sm text-gray-600">@{suggestion.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export const MentionInput = ({ value, onChange, onMention }) => {
  const [mentionSystem, setMentionSystem] = useState(null);
  const inputRef = useRef(null);

  const handleInput = (e) => {
    const text = e.target.value;
    const lastChar = text[text.length - 1];

    if (lastChar === '@') {
      const element = e.target;
      setMentionSystem(
        <MentionSystem
          onMention={(char) => onMention(char)}
          onSelect={(suggestion) => {
            const beforeMention = text.slice(0, -1);
            const mention = `@${suggestion.username}`;
            const newValue = beforeMention + mention + ' ';
            onChange(newValue);
            setMentionSystem(null);
          }}
        />
      );
    } else {
      onChange(text);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInput}
        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Write something... Use @ to mention someone"
      />
      {mentionSystem}
    </div>
  );
};

export const MentionDisplay = ({ content }) => {
  const renderContent = () => {
    // Split content by mentions (@username)
    const parts = content.split(/(@\w+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <Link
            key={index}
            to={`/profile/${username}`}
            className="text-blue-600 hover:underline"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  return <div>{renderContent()}</div>;
};

export default MentionSystem;
