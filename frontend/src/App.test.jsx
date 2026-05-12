// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App Root Component', () => {
  it('renders without crashing and shows the main landing page', () => {
    render(<App />)
    // By default, it should render StudentSelect which has "Select a Student"
    expect(screen.getByText(/Select a Student/i)).toBeInTheDocument()
  })
})
