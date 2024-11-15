import { Link } from "react-router-dom";

export const Dashboard: React.FC = () => <div>
    <h3>Home</h3>
    <p>This is the very first not even alfa version of AcidWatch.
        Currently limited to a very basic <Link to="/arcs">ARCS</Link> run.</p>

    <h4>Coming soon (or later):</h4>
    <ul>
        <li>Possibility to run different models</li>
        <li>Create scenarios</li>
        <li>Compare results from different scenarios/models</li>
        <li>Compare results with experimental lab results</li>
        <li>Access control</li>
        <li>Share results</li>
        <li>etc</li>
    </ul>
</div>;



export const Launch: React.FC = () => <h3>Launch</h3>;
export const Settings: React.FC = () => <h3>Settings</h3>;
export const Favourites: React.FC = () => <h3>Favourites</h3>;
