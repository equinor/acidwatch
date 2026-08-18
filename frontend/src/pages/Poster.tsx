import accumulationChart from "../../../docs/assets/images/experiments_1_2_liquid_accumulation_100h.png";
import methodDiagram from "../../../docs/assets/images/gibbs_srk_vanlaar_method.png";
import experiment1Autoclave from "../assets/poster/experiment-1-autoclave.png";
import experiment2Fog from "../assets/poster/experiment-2-fog.png";
import experiment2Coupons from "../assets/poster/experiment-2-coupons.png";
import "./Poster.css";

const ExperimentCard = ({
    title,
    condition,
    impurities,
    observation,
    tone,
}: {
    title: string;
    condition: string;
    impurities: string[];
    observation: string;
    tone: "surface" | "bulk";
}) => (
    <article className={`experiment-card ${tone}`}>
        <div className="experiment-card__topline">
            <span>{title}</span>
            <span>{condition}</span>
        </div>
        <div className="impurity-list" aria-label={`${title} impurity feed`}>
            {impurities.map((impurity) => (
                <span key={impurity}>{impurity}</span>
            ))}
        </div>
        <p>{observation}</p>
    </article>
);

const Poster = () => (
    <main className="poster">
        <header className="poster__header">
            <div className="poster__eyebrow">AcidWatch | Dense-phase CO2 transport</div>
            <h1>When do impurities in CO2 become a corrosion risk?</h1>
            <p className="poster__lede">
                Coupling reaction thermodynamics with phase equilibria to screen for corrosive acid formation in dense-phase CO2.
            </p>
            <div className="poster__meta">
                <span>Sven Morten Hesjevik</span>
                <span>Equinor ASA</span>
                <span>AMPP Italy Chapter Conference &amp; Expo 2026</span>
            </div>
        </header>

        <section className="poster__problem" aria-labelledby="problem-title">
            <div>
                <p className="section-kicker">Why it matters</p>
                <h2 id="problem-title">Corrosion depends on more than the impurity level</h2>
            </div>
            <p>
                H2S, SO2, NOx, H2O and O2 can react in CO2-rich streams to form corrosive acids. Those reactions may occur at the steel surface or in the bulk phase, where an acid-rich liquid can form and create a severe local corrosion environment.
            </p>
            <div className="risk-paths" aria-label="Two pathways to corrosion">
                <div><strong>01</strong><span>Surface adsorption and reaction</span></div>
                <div><strong>02</strong><span>Bulk reaction and acid-phase formation</span></div>
            </div>
        </section>

        <section className="poster__grid poster__grid--methods" aria-label="Study approach">
            <div className="panel panel--intro">
                <p className="section-kicker">Approach</p>
                <h2>Thermodynamics first, phase split second</h2>
                <p>
                    Gibbs minimization calculates the single-phase equilibrium composition without prescribing every reaction pathway. Its outlet composition is then flashed with SRK-Van Laar to test for CO2-rich and aqueous-phase partitioning.
                </p>
                <dl className="formula-list">
                    <div><dt>Gibbs equilibrium</dt><dd>min G = Σ n<sub>i</sub>μ<sub>i</sub></dd></div>
                    <div><dt>Phase equilibrium</dt><dd>f<sub>i</sub><sup>CO2</sup> = f<sub>i</sub><sup>aq</sup></dd></div>
                </dl>
            </div>
            <figure className="panel panel--figure">
                <img src={methodDiagram} alt="Gibbs minimization and SRK-Van Laar phase-equilibrium model workflow" />
                <figcaption>Reaction equilibrium and phase equilibrium are evaluated in sequence.</figcaption>
            </figure>
        </section>

        <section className="poster__experiments" aria-labelledby="experiments-title">
            <div className="section-heading">
                <div>
                    <p className="section-kicker">Experimental comparison</p>
                    <h2 id="experiments-title">Two impurity mixtures, distinct outcomes</h2>
                </div>
                <p>Stainless-steel autoclave tests at 25 C, with visual monitoring of phase formation.</p>
            </div>
            <div className="experiment-grid">
                <ExperimentCard
                    title="Experiment 1"
                    condition="100 bar | 25 C"
                    impurities={["H2S 675 ppm", "SO2 72 ppm", "H2O 675 ppm", "O2 70 ppm"]}
                    observation="No visible fog or acid drop-out; coupon surface changes were observed."
                    tone="surface"
                />
                <ExperimentCard
                    title="Experiment 2"
                    condition="99 bar | 25 C"
                    impurities={["H2S 36 ppm", "SO2 32 ppm", "O2 90 ppm", "H2O 20 ppm", "NO2 31 ppm"]}
                    observation="Visible fog and stronger reactions indicate formation of a separate acidic phase."
                    tone="bulk"
                />
            </div>
            <div className="observation-strip" aria-label="Experimental visual observations">
                <figure>
                    <img src={experiment1Autoclave} alt="Experiment 1 autoclave image sequence with no visible fog" />
                    <figcaption><strong>Experiment 1</strong> No visible fog or bulk liquid</figcaption>
                </figure>
                <figure>
                    <img src={experiment2Fog} alt="Experiment 2 autoclave image sequence showing visible fog" />
                    <figcaption><strong>Experiment 2</strong> Visible fog develops during exposure</figcaption>
                </figure>
                <figure>
                    <img src={experiment2Coupons} alt="Experiment 2 steel coupons before and after exposure" />
                    <figcaption><strong>Experiment 2</strong> Coupon surface change after exposure</figcaption>
                </figure>
            </div>
        </section>

        <section className="poster__grid poster__grid--results" aria-label="Model results">
            <figure className="panel panel--chart">
                <img src={accumulationChart} alt="Predicted cumulative acidic liquid over 100 hours for both experiments" />
                <figcaption>Predicted liquid accumulation at 47 g/h CO2 flow.</figcaption>
            </figure>
            <div className="panel panel--results">
                <p className="section-kicker">Model results</p>
                <h2>Bulk phase formation is predicted for Experiment 2</h2>
                <div className="result-row"><span className="result-tag result-tag--muted">Exp. 1</span><p>Low acid formation; no separate liquid phase predicted.</p></div>
                <div className="result-row"><span className="result-tag">Exp. 2</span><p>Concentrated H2SO4-rich liquid phase predicted, consistent with observed fog.</p></div>
                <p className="results-note">Outlet-concentration deviations point to kinetic, transport, or surface effects beyond equilibrium.</p>
            </div>
        </section>

        <section className="poster__conclusion" aria-labelledby="conclusion-title">
            <div>
                <p className="section-kicker">Conclusion</p>
                <h2 id="conclusion-title">A fast screen for complex impurity mixtures</h2>
            </div>
            <p>
                Gibbs minimization is valuable because it evaluates many impurities without specifying individual reactions. It is a thermodynamic screening tool, not a corrosion-rate model: kinetics, non-equilibrium behaviour and surface reactions can dominate in dense-phase CO2. Decisions require quantitative validation against experiments.
            </p>
        </section>

        <footer className="poster__footer">
            <span>Hesjevik, S. M., Svenningsen, G. &amp; Morland, B. H. Impurity reactions in CO2 streams with low sulphur content.</span>
            <span>Sonke, J. Corrosion thresholds for chemical interaction and precipitation in impure CO2: Theory and practice. AMPP Italy, 2026.</span>
        </footer>
    </main>
);

export default Poster;