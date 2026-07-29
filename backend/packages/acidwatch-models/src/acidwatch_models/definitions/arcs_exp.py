from .arcs import ArcsAdapter


class ArcsExpAdapter(ArcsAdapter):
    model_id = "arcs_exp"
    display_name = "ARCS experimental"
    description = """\
Automated Reactions for CO2 Storage (ARCS) model.

ARCS combines first-principles calculations with Monte-Carlo sampling and
models possible reactions that may occur under a given set of conditions.
This process identifies the most frequently occurring reactions and paths,
final products, and expected concentrations.

This model is under significant development and is expected to change while
developed. Therefore a development version of it has been released while work
is ongoing.

Source code found [on GitHub (badw/arcs)](https://github.com/badw/arcs).
"""
