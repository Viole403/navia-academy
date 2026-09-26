# Content credits

Where the generated content came from, and what each piece is used for.

## Reading comprehension — Belebele

Used by `data/json/<lang>/assessments/<exam>/comprehension-*.json`, generated
by `scripts/generate-comprehension.ts`. Each exercise shows its own `passageSource`
naming the dataset and the specific source page, so a reader can trace one
question back to where the text came from.

- Dataset: <https://huggingface.co/datasets/facebook/belebele>
  (code and dataset card: <https://github.com/facebookresearch/belebele>)
- Passages originate from FLORES-200, <https://github.com/facebookresearch/flores>,
  which in turn draws on Wikinews and Wikivoyage.

### Terms

The passages are adapted — trimmed, split into tiers by length, and re-wrapped
in the exercise format — so the adapted content is **CC-BY-SA 4.0**, and
attribution must travel with it. Anyone redistributing these exercises has to
do so under the same terms and keep the credit.

The same repository also publishes an assembled training set under
**CC-BY-NC 4.0** (non-commercial). It is not read: the generator pulls only the
main dataset.

### Levelling caveat

Belebele carries no CEFR, JLPT or HSK label. The three banks per language are
split by passage length alone, which is a proxy for difficulty and not a
proficiency judgement. Belebele is a benchmark built to be hard, so the lower
tiers are optimistic, and the levels below each exam's lowest tier have no
comprehension material at all.
