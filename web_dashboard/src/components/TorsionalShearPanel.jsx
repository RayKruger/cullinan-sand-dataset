import React from 'react';

// Informational placeholder for Bevameter torsional (rotational) shear tests.
// These are part of the broader study; their waveform/curve data is not bundled
// in this static preview. Reuses the shared info-card styling.
export default function TorsionalShearPanel() {
  return (
    <div className="panel">
      <div className="infocard">
        <div className="infocard__body">
          <h2 className="infocard__title">Bevameter torsional shear tests</h2>
          <p className="infocard__lead">
            In a <strong>torsional (rotational) shear</strong> test a grousered annular ring is
            rotated on the soil under constant normal stress. The measured{' '}
            <strong>shear stress versus angular (rim) displacement</strong> gives the
            shear-strength parameters — cohesion <em>c</em> and friction angle <em>φ</em> — and the
            shear-deformation modulus <em>K</em> used in terramechanics traction models.
          </p>

          <div className="infocard__tiles">
            <div className="tile">
              <span className="tile__num">τ–θ</span>
              <span className="tile__label">shear stress vs rotation</span>
            </div>
            <div className="tile">
              <span className="tile__num">c, φ</span>
              <span className="tile__label">strength parameters</span>
            </div>
            <div className="tile">
              <span className="tile__num">K</span>
              <span className="tile__label">shear-deformation modulus</span>
            </div>
          </div>

          <p className="infocard__note">
            The torsional-shear series is documented in the associated{' '}
            <a href="https://doi.org/10.1016/j.jterra.2026.101138" target="_blank" rel="noreferrer">
              Journal of Terramechanics (2026) paper
            </a>
            ; its data is not part of this interactive preview. The density-comparison{' '}
            <strong>linear</strong> shear tests are on the <em>Linear Shear</em> tab.
          </p>
        </div>
      </div>
    </div>
  );
}
