import logo from './logo.png';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <form action={"/refactor"} method="post" className="form">
          <label>
            Code Box
          </label>
          <input
            type="text"
            className='input'
            defaultValue={"Code goes in here..."}
          />
          <button>
            Submit for refactor
          </button>
        </form>

      </header>
    </div>
  );
}


export default App;
