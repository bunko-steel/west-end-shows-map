import MapCanvas from "./components/MapCanvas";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <MapCanvas />
    </ThemeProvider>
  );
}

export default App;
