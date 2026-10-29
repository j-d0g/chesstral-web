# Component Architecture Guide

This directory contains all React components for the ChessGPT web application. Each component has a specific responsibility and follows consistent patterns.

## 🏗️ Component Hierarchy

```
App.tsx (Root)
└── ChessGame.tsx (Main Game Interface)
    ├── EngineSelector.tsx (AI Engine Selection)
    ├── GameControls.tsx (Game Actions)
    ├── Chessboard (react-chessboard library)
    ├── MoveHistory.tsx (Move List Display)
    ├── CommentaryBox.tsx (AI Commentary)
    ├── EvaluationBar.tsx (Position Evaluation)
    ├── PositionInput.tsx (FEN/PGN Loading)
    └── TemperatureControl.tsx (AI Settings)
```

## 📋 Component Reference

### **Core Game Components**

| Component | Purpose | Key Props | State Management |
|-----------|---------|-----------|------------------|
| `ChessGame.tsx` | Main game orchestrator | None (root) | Zustand store |
| `EngineSelector.tsx` | AI engine/model selection | `selectedEngine`, `onEngineChange` | Local + store |
| `GameControls.tsx` | Game actions (new, flip) | `onNewGame`, `onFlipBoard` | Props only |

### **Display Components**

| Component | Purpose | Key Props | Data Source |
|-----------|---------|-----------|-------------|
| `MoveHistory.tsx` | Shows move list | `moves` | Game store |
| `CommentaryBox.tsx` | AI move commentary | `commentaryHistory` | Game store |
| `EvaluationBar.tsx` | Position evaluation | `evaluation`, `turn` | Game store |
| `ErrorDisplay.tsx` | Error handling UI | `error`, `onRetry` | Props |

### **Input Components**

| Component | Purpose | Key Props | Functionality |
|-----------|---------|-----------|---------------|
| `PositionInput.tsx` | Load FEN/PGN positions | `onLoadPosition` | Position parsing |
| `TemperatureControl.tsx` | AI creativity settings | `temperature`, `onChange` | Slider control |

## 🎯 Adding New Components

### **1. Component Template**
```typescript
/**
 * ComponentName.tsx - Brief Description
 * 
 * PURPOSE: What this component does
 * RESPONSIBILITIES: Key duties
 * PROPS: Main props it accepts
 * STATE: What state it manages
 */

import React from 'react'

interface ComponentNameProps {
  // Define props with clear types
}

const ComponentName: React.FC<ComponentNameProps> = ({
  // Destructure props
}) => {
  // Component logic
  
  return (
    <div className="component-name">
      {/* JSX content */}
    </div>
  )
}

export default ComponentName
```

### **2. Integration Steps**
1. **Create component** following the template
2. **Add to parent** component imports
3. **Update this README** with component details
4. **Add CSS** in `../styles/` if needed
5. **Export** from `index.ts` if creating barrel exports

### **3. Naming Conventions**
- **PascalCase** for component files (`ChessGame.tsx`)
- **camelCase** for props and functions (`onEngineChange`)
- **kebab-case** for CSS classes (`chess-game-layout`)
- **Descriptive names** that explain purpose

## 🔄 State Flow

```
User Action → Component → Store Action → API Call → Store Update → Component Re-render
```

### **Example: Making a Move**
1. User drags piece on `Chessboard`
2. `ChessGame.onDrop` called
3. `gameStore.makeHumanMove()` triggered
4. API call to get AI response
5. Store updated with new game state
6. All components re-render with new data

## 🎨 Styling Patterns

- **CSS Modules** or **global CSS** in `../styles/`
- **BEM methodology** for class naming
- **Responsive design** with mobile-first approach
- **Consistent spacing** using CSS custom properties

## 🧪 Testing Patterns

- **Component tests** in `ComponentName.test.tsx`
- **Props testing** for all required props
- **User interaction** testing with React Testing Library
- **Snapshot tests** for UI consistency

## 🔍 Common Patterns

### **Props Interface**
```typescript
interface ComponentProps {
  // Required props first
  requiredProp: string
  
  // Optional props with defaults
  optionalProp?: boolean
  
  // Event handlers
  onAction: (data: any) => void
  
  // Style/className props
  className?: string
}
```

### **State Management**
```typescript
// For local state
const [localState, setLocalState] = useState(initialValue)

// For global state
const { globalState, globalAction } = useGameStore()
```

### **Event Handling**
```typescript
const handleAction = useCallback((data: any) => {
  // Handle the action
  onAction?.(data)
}, [onAction])
```

This architecture makes it easy for LLMs to:
- **Understand component purpose** from documentation
- **Find the right component** to modify
- **Follow consistent patterns** when adding features
- **Understand data flow** between components 