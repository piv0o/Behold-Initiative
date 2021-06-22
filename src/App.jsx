import React from 'react';
// import { Default } from './src/components/Initiative.jsx'; 

class App extends React.Component {
    render() {
        console.log(test)
        return <div>
        <h1>Hello World</h1>
        {/* <Default  name="Aaron" /> */}
        </div>
    }
}

ReactDOM.render(
    <App />,
    document.getElementById("root")
);