# ADR-0012 — Grid metric: 5-ft squares, diagonals 5 ft (Chebyshev)
Accepted. PHB-default movement; distFt = 5*max(|dx|,|dy|); AoE affected-cell rule = cell center within shape. Consequence accepted: square-ish spheres. All geometry flows through one affectedCells/dist module; changing the metric later is one module + re-fixtured goldens.
