import { getTheatresWithShows } from "./data";

function App() {
  const theatres = getTheatresWithShows();
  console.log(theatres);
  return <pre>{JSON.stringify(theatres, null, 2)}</pre>;
}

export default App;
