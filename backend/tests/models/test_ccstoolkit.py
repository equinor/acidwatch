from acidwatch_api.models.ccstoolkit import CCStoolkitAdapter

def test_output_ccstoolkit():
    P = {
        'S': 0.5,  # [mol/m^3], [mM]	#Total amount of sulphur (H2S, SOx, ...)
        'N': 0.75,  # [mol/m^3], [mM]	#Total amount of nitrogen (NOx, HNOx, ...)
        'CO2': 2e3,  # [mol/m^3], [mM]	#Activity of CO2								#Optional	#Default is 2000
        'T': 298.15  # [K]				#Temperature									#Optional	#Default is 298.15
    }

    stability_map = corrosion_maps.get_stability_maps(P)
    assert stability_map is not None