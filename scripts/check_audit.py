"""Regression fixtures for audit blind spots; no browser or provider calls."""
import tempfile
import unittest
from pathlib import Path
import audit_site as audit


class AuditContracts(unittest.TestCase):
    def test_accessible_names_include_nested_text_and_image_alternatives(self):
        parser = audit.PageParser()
        parser.feed('<h1>Title</h1><h2> </h2><a href="/"> </a><button><span>Save</span></button><a href="/"><img alt="Home"></a>')
        self.assertEqual(parser.empty_elements, ['h2', 'a'])

    def test_implicit_labels_and_aria_references_are_recorded(self):
        parser = audit.PageParser()
        parser.feed('<label>Consent<input type="checkbox"></label><input id="email" aria-describedby="missing">')
        self.assertTrue(parser.controls[0]['implicit_label'])
        self.assertFalse(parser.controls[1]['implicit_label'])
        self.assertEqual(parser.aria_refs, ['missing'])

    def test_absolute_local_links_keep_the_project_subpath(self):
        audit.BASE_URL = 'https://site.test/demo/'
        audit.PUBLIC = Path('/tmp/audit-output').resolve()
        target, fragment = audit.resolve_internal_target(audit.PUBLIC / 'index.html', 'https://site.test/demo/about/#team')
        self.assertEqual(target, audit.PUBLIC / 'about/index.html')
        self.assertEqual(fragment, 'team')
        self.assertIsNone(audit.resolve_internal_target(audit.PUBLIC / 'index.html', 'https://elsewhere.test/about/')[0])
        self.assertEqual(audit.resolve_internal_target(audit.PUBLIC / 'index.html', '/about/')[0].name, '__invalid_subpath__')

    def test_unexpected_assets_and_dangerous_links_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            audit.PUBLIC = Path(directory).resolve(); audit.BASE_URL = 'https://site.test/'
            (audit.PUBLIC / 'secret.png').write_bytes(b'unexpected')
            (audit.PUBLIC / 'index.html').write_text('<h1>Example</h1><a href="javascript:alert(1)">Link</a><input name="unlabeled">')
            failures = '\n'.join(audit.audit())
            self.assertIn('unexpected release asset: secret.png', failures)
            self.assertIn('unsupported URL', failures)
            self.assertIn('lacks a label', failures)

    def test_links_cannot_escape_output_through_a_symlink(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            audit.PUBLIC = root / 'public'; audit.PUBLIC.mkdir()
            outside = root / 'outside'; outside.mkdir()
            (outside / 'index.html').write_text('synthetic external file')
            (audit.PUBLIC / 'escape').symlink_to(outside, target_is_directory=True)
            audit.BASE_URL = 'https://site.test/'
            target, _ = audit.resolve_internal_target(audit.PUBLIC / 'index.html', '/escape/')
            self.assertEqual(target.name, '__invalid_output_path__')


if __name__ == '__main__':
    unittest.main()
