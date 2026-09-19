```bash
for number in {1..10}; do
  ./apps/cli/bin/pixdom.js convert \
    --url https://experience.petitduc.ca/rendez-vous-touristique-cantons-2026 \
    --format gif \
    --auto \
    --wait-until domcontentloaded \
    --duration 5000 \
    --width 1920 \
    --height 1080 \
    --fps 10 \
    --verbose \
    --keys r,s \
    --keys-delay 500 \
    --resize-width 480 \
    --resize-height 270 \
    --output "experience-demo.fr.${number}.gif"
done

### Version française, sans statistiques
for number in {1..10}; do ./apps/cli/bin/pixdom.js convert --url https://experience.petitduc.ca/rendez-vous-touristique-cantons-2026 --format gif --auto --wait-until domcontentloaded --duration 5000 --width 1920 --height 1080 --fps 10 --verbose --keys r,s --keys-delay 500 --resize-width 480 --resize-height 270 --output "experience-demo.fr.${number}.gif"; done
```
