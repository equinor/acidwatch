import asyncio
from typing import Any

from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase, TextResult
from acidwatch_models.definitions.srk_vanlaar import (
    SRKVanLaarAdapter as SRKVanLaarDefinition,
)
from neqsim import jneqsim


class SRKVanLaarAdapter(SRKVanLaarDefinition):
    _formula_to_neqsim = {
        "H2O": "water",
        "O2": "oxygen",
        "H2SO4": "sulfuric acid",
        "HNO3": "nitric acid",
        "CH4": "methane",
        "Ar": "argon",
        "CH2O2": "formic acid",
        "H2": "hydrogen",
        "CH3COOH": "acetic acid",
        "CH3OH": "methanol",
        "CH3CHO": "C2H4O",
        "H2CO": "CH2O",
        "NH3": "ammonia",
        "N2": "nitrogen",
        "CH3CH2OH": "ethanol",
        "HOCH2CH2OH": "MEG",
        "(CH2CH2OH)2O": "DEG",
        "HOCH2(CH2CH2O)2CH2OH": "TEG",
        "H2NCH2CH2OH": "MEA",
        "CH3N(C2H4OH)2": "MDEA",
        "(CH2CH2OH)2NH": "DEA",
        "CH3CH3": "ethane",
        "CH3CH2CH3": "propane",
        "(CH3)2CHCH3": "i-butane",
        "CH3CH2CH2CH3": "n-butane",
        "CH3(CH2)3CH3": "n-pentane",
        "C6H5CH3": "toluene",
        "C6H4(CH3)2": "o-Xylene",
    }

    _neqsim_to_formula = {v: k for k, v in _formula_to_neqsim.items()}

    async def run(self) -> RunResult:
        return await asyncio.to_thread(self._run)

    def _run(self) -> RunResult:
        h2o = self.concentrations.get("H2O", 0.0)
        h2so4 = self.concentrations.get("H2SO4", 0.0)
        hno3 = self.concentrations.get("HNO3", 0.0)
        temp = self.conditions.temperature + 273
        pres = self.conditions.pressure
        flow_rate = self.parameters.flow_rate

        co2 = 1e6 - sum(self.concentrations.values())

        system = jneqsim.thermo.system.SystemVanLaarActivitySRK(temp, pres)
        system.addComponent("CO2", co2)
        if h2o > 0:
            system.addComponent(self._formula_to_neqsim["H2O"], h2o)
        if h2so4 > 0:
            system.addComponent(self._formula_to_neqsim["H2SO4"], h2so4)
        if hno3 > 0:
            system.addComponent(self._formula_to_neqsim["HNO3"], hno3)

        for component, amount in self.concentrations.items():
            if component in {"H2O", "H2SO4", "HNO3"}:
                continue
            neqsim_name = self._formula_to_neqsim.get(component, component)
            system.addComponent(neqsim_name, amount)

        system.createDatabase(True)
        system.setMixingRule("classic")

        ops = jneqsim.thermodynamicoperations.ThermodynamicOperations(system)
        ops.TPflash()
        system.initProperties()

        phases = self._extract_phases(system)
        table = self._build_report(system, flow_rate)

        return phases, TextResult(data=table, label="Solubility Output")

    def _extract_phases(self, system: Any) -> list[Phase]:
        if int(system.getNumberOfPhases()) == 0:
            return [Phase(kind="co2-rich", fraction=1.0, concentrations={})]

        co2_phase = system.getPhase(0)
        co2_rich_fraction = float(system.getBeta(0))
        co2_rich_concs: dict[str, int | float] = {}
        for j in range(int(co2_phase.getNumberOfComponents())):
            comp = co2_phase.getComponent(j)
            name = str(comp.getName())
            if name.lower() == "co2":
                continue
            formula = self._neqsim_to_formula.get(name, name)
            co2_rich_concs[formula] = float(comp.getx()) * 1e6

        phases = [
            Phase(
                kind="co2-rich",
                fraction=co2_rich_fraction,
                concentrations=co2_rich_concs,
            )
        ]

        if co2_rich_fraction < 1.0 and int(system.getNumberOfPhases()) > 1:
            aqueous_phase = system.getPhase(1)
            aqueous_fraction = float(system.getBeta(1))
            aqueous_concs: dict[str, int | float] = {}
            for j in range(int(aqueous_phase.getNumberOfComponents())):
                comp = aqueous_phase.getComponent(j)
                name = str(comp.getName())
                if name.lower() == "co2":
                    continue
                formula = self._neqsim_to_formula.get(name, name)
                aqueous_concs[formula] = float(comp.getx()) * 1e6

            phases.append(
                Phase(
                    kind="aqueous",
                    fraction=aqueous_fraction,
                    concentrations=aqueous_concs,
                )
            )

        return phases

    def _build_report(self, system: Any, flow_rate: float) -> str:
        lines: list[str] = []
        lines.append("SRK VanLaar TP flash completed")
        lines.append(f"Temperature [C]: {self.conditions.temperature:.2f}")
        lines.append(f"Pressure [bara]: {self.conditions.pressure:.2f}")
        lines.append(f"Flow rate [Mt/year]: {flow_rate:.3f}")
        lines.append(f"Number of phases: {int(system.getNumberOfPhases())}")

        for i in range(int(system.getNumberOfPhases())):
            phase = system.getPhase(i)
            beta = float(system.getBeta(i))
            phase_type = str(phase.getType())
            lines.append(
                f"phase {i}: type={phase_type}, beta={beta:.6e}, "
                f"density={float(phase.getDensity('kg/m3')):.6f} kg/m3"
            )

            total_mass_basis = 0.0
            component_data: list[tuple[str, float, float]] = []
            for j in range(int(phase.getNumberOfComponents())):
                comp = phase.getComponent(j)
                x_i = float(comp.getx())
                mw_i = float(comp.getMolarMass())
                mass_basis_i = x_i * mw_i
                total_mass_basis += mass_basis_i
                component_data.append((str(comp.getName()), x_i, mass_basis_i))

            if phase_type != "GAS" and beta > 1.0e-12 and total_mass_basis > 0.0:
                lines.append("  Component wt% in this non-gas phase:")
                for name, x_i, mass_basis_i in component_data:
                    wt_pct = 100.0 * mass_basis_i / total_mass_basis
                    lines.append(f"    {name:15s} x = {x_i:.6e}   wt% = {wt_pct:.6f}")

        return "\n".join(lines)
