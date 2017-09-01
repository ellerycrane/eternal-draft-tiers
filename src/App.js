import React, {Component} from 'react'
import logo from './logo.svg'
import './compiled-css/index.css'

import GoogleSpreadsheetsParser from './googleSpreadsheetsParser'
import Fuse from './fuse'

const spreadsheetUrl = "https://docs.google.com/spreadsheets/d/18n-9kwej73Up0R4zF2nGdKFEAQ3LT_D2FdqDlu7jTU0/pubhtml",
  sheetTitle = 'draft_tier_list'

const ranks = [
  'S',
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
  "F-",
]

class SearchBar extends React.Component {
  constructor(props) {
    super(props)
    this.handleFilterTextInputChange = this.handleFilterTextInputChange.bind(this)
    this.lastInput = new Date().getTime()
  }

  handleFilterTextInputChange(e) {
    this.props.onFilterTextInput(e.target.value)
  }

  handleKeyPress(e){
    let inputTime = new Date().getTime()
    if(e.key == 'Escape'){
      // escape clears the input
      this.props.onFilterTextInput('')
    }
    if (e.keyCode === 114 || (e.ctrlKey && e.keyCode === 70) || (e.metaKey && e.keyCode === 70)) {
      // ctrl+f or cmd+f is disabled, since I keep doing it by accident
      e.preventDefault()
      this.props.onFilterTextInput('') // also clear the input, since usually this means I want to start typing a new card
    }
    if(inputTime - this.lastInput > 1000){
      this.props.onFilterTextInput('')
    }
    this.lastInput = inputTime
    this.filterInput.focus()
  }

  componentDidMount(){
    this.filterInput.focus()
    document.onkeydown = (evt) => {
      evt = evt || window.event
      this.handleKeyPress(evt)
      // if (evt.ctrlKey && evt.keyCode == 90) {
      //   alert("Ctrl-Z")
      // }
    }
  }

  render() {
    return (
      <form>
        <input
          ref={(input) => { this.filterInput = input }}
          type="text"
          placeholder="Filter cards..."
          value={this.props.filterText}
          onChange={this.handleFilterTextInputChange}
        />
      </form>
    )
  }
}

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      rawColumns: null,
      rankedCards: null,
      filteredCards: null,
      filterText: ''
    }
  }

  componentDidMount() {
    this.gss = new GoogleSpreadsheetsParser(spreadsheetUrl, {sheetTitle: sheetTitle, hasTitle: true})
    console.log(this.parseRanks(this.gss.columns))
    let rankedCards = this.parseRanks(this.gss.columns)
    var options = {
      shouldSort: true,
      tokenize: true,
      matchAllTokens: true,
      threshold: 0.1,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: [
        "cardName"
      ]
    }
    this.fuse = new Fuse(rankedCards, options) // "list" is the item array

    window.GSS = this.gss
    console.log(JSON.stringify(rankedCards, null, 2))
    this.setState({rawColumns: this.gss.columns, rankedCards: rankedCards, filteredCards: rankedCards})
  }

  handleFilterTextInput(filterText) {
    console.log("FILTERING with text", filterText)
    let result = this.state.rankedCards
    if (filterText && filterText !== '') {
      result = this.fuse.search(filterText)
    }

    this.setState({
      filterText: filterText,
      filteredCards: result
    })
  }
  scrubRank(rank) {
    return (rank || '').replace('-', '-minus').replace('+', '-plus').toLowerCase()
  }

  parseRanks(columns) {
    let currentRank = null,
      cardRanks = [],
      cardNames = [],
      ignoredNames = ['All Influence Strangers', 'All Banners']

    columns.forEach((col, colIdx)=> {
      currentRank = null
      col.forEach((row, rowIdx)=> {
        if (ranks.indexOf(row) !== -1) {
          currentRank = row
        } else if (row !== null && row !== '' && currentRank !== null && cardNames.indexOf(row) === -1 && ignoredNames.indexOf(row) === -1) {
          cardRanks.push({cardName: row, rank: currentRank})
          cardNames.push(row)
        }
      })
    })
    return cardRanks
  }

  makeSafeForCSS(name) {
    return name.replace(/[^a-z0-9]/g, function (s) {
      var c = s.charCodeAt(0)
      if (c == 32) return '-'
      if (c >= 65 && c <= 90) return '_' + s.toLowerCase()
      return '__' + ('000' + c.toString(16)).slice(-4)
    })
  }


  render() {
    let cols = []
    if (this.state.rawColumns) {
      this.state.rawColumns.forEach((col, colIdx)=> {
        let columnRows = []
        col.forEach((row, rowIdx)=> {
          columnRows.push(<li key={'cell-' + colIdx + '-' + rowIdx}>{row}</li>)
        })
        cols.push(
          <ul key={colIdx}>
            {columnRows}
          </ul>
        )
      })
    }

    let cards = [],
      cssData = []
    if (this.state.filteredCards) {
      this.state.filteredCards.forEach((card)=> {
        cards.push(
          <div className={'card ' + this.makeSafeForCSS(card.cardName) + ' ' + this.scrubRank(card.rank)} key={card.cardName}>
            <div className={'card-rank '+this.scrubRank(card.rank)}>{card.rank}</div>
          </div>
        )
        // cards.push(<img class="grid-card-img animate" src={"http://www.numotgaming.com/cards/images/cards/"+card.cardName+".png"} />)
        cssData.push({
          cardName: card.cardName,
          className: this.makeSafeForCSS(card.cardName),
          imageUrl: "http://www.numotgaming.com/cards/images/cards/" + card.cardName + ".png"
        })
      })
    }
    {/*<pre>*/}
          {/*{cssData.map((d)=>{*/}
            {/*return `.${d.className} {\nbackground-image: url("${d.imageUrl}");\n}\n\n`*/}
          {/*})}*/}
        {/*</pre>*/}
    // cards = []
    return (
      <div className="App" >
        <SearchBar
          filterText={this.state.filterText}
          onFilterTextInput={this.handleFilterTextInput.bind(this)}
        />

        <div className="cards">
          {cards}
        </div>


      </div>
    )
  }
}

export default App
