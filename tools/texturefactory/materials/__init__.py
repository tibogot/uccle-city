"""All texture-factory materials: REGISTRY[material] = {size_m, module, variants: {name: {seed, lattice, note, build}}}"""
import importlib

MODULES = ["bricks", "ground", "walls", "roofs", "bark", "leaves"]

REGISTRY = {}
for _m in MODULES:
    mod = importlib.import_module(f"materials.{_m}")
    for name, d in mod.MATERIALS.items():
        REGISTRY[name] = {**d, "module": _m}
